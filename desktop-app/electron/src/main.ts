/**
 * HavenAI Desktop App - Main Process
 * 
 * This is the main Electron process that:
 * - Creates the application window
 * - Manages the system tray icon
 * - Spawns and communicates with the Python agent
 * - Shows native notifications
 */

import { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage, shell, safeStorage, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { PythonBridge } from './python-bridge';
import Store from 'electron-store';

// Persistent storage for settings
const store = new Store();

// --- Encrypted credential helpers using OS keychain (macOS Keychain / Windows DPAPI) ---
function encryptAndStore(key: string, value: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value);
    store.set(key, encrypted.toString('base64'));
  } else {
    // Fallback to plaintext if OS encryption is unavailable (rare).
    store.set(key, value);
  }
}

function decryptFromStore(key: string): string | undefined {
  const raw = store.get(key) as string | undefined;
  if (!raw) return undefined;
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(raw, 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      // May be a legacy plaintext value — return as-is and it will be re-encrypted on next save.
      return raw;
    }
  }
  return raw;
}

function deleteFromStore(key: string): void {
  store.delete(key);
}

// Global references
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pythonBridge: PythonBridge | null = null;
let isQuitting = false;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const rendererDevPort = process.env.RENDERER_PORT || '3001';

type MonitorModule = 'file' | 'process' | 'network';
type MonitorLifecycleState = 'off' | 'pending_permission' | 'running' | 'blocked';

type MonitorDesired = Record<MonitorModule, boolean>;
type MonitorStateMap = Record<MonitorModule, MonitorLifecycleState>;
type MonitorBlockers = Record<MonitorModule, string[]>;
const MONITOR_MODULES: MonitorModule[] = ['file', 'process', 'network'];
const DEFAULT_MONITOR_STATE: MonitorStateMap = {
  file: 'off',
  process: 'off',
  network: 'off',
};

function readMonitorDesired(): MonitorDesired {
  const raw = (store.get('monitorDesired') || {}) as Partial<MonitorDesired>;
  return {
    file: Boolean(raw.file),
    process: Boolean(raw.process),
    network: Boolean(raw.network),
  };
}

function readMonitorStateMap(): MonitorStateMap {
  const raw = (store.get('monitorState') || {}) as Partial<MonitorStateMap>;
  return {
    file: raw.file || DEFAULT_MONITOR_STATE.file,
    process: raw.process || DEFAULT_MONITOR_STATE.process,
    network: raw.network || DEFAULT_MONITOR_STATE.network,
  };
}

function readMonitorBlockers(): MonitorBlockers {
  const raw = (store.get('monitorBlockers') || {}) as Partial<MonitorBlockers>;
  return {
    file: Array.isArray(raw.file) ? raw.file : [],
    process: Array.isArray(raw.process) ? raw.process : [],
    network: Array.isArray(raw.network) ? raw.network : [],
  };
}

function writeMonitorState(
  desired: MonitorDesired,
  state: MonitorStateMap,
  blockers: MonitorBlockers,
) {
  store.set('monitorDesired', desired);
  store.set('monitorState', state);
  store.set('monitorBlockers', blockers);
}

function moduleToPreferencePatch(module: MonitorModule, enabled: boolean) {
  if (module === 'file') return { file_monitoring_enabled: enabled };
  if (module === 'process') return { process_monitoring_enabled: enabled };
  return { network_monitoring_enabled: enabled };
}

function buildMonitorControlState() {
  return {
    desired: readMonitorDesired(),
    state: readMonitorStateMap(),
    blockers: readMonitorBlockers(),
    updated_at: new Date().toISOString(),
  };
}

function emitMonitorControlState() {
  mainWindow?.webContents.send('monitor-state', buildMonitorControlState());
  // Keep the tray menu label ("X of N monitors running") in sync with reality
  refreshTrayMenu();
}

function checkMonitorPermissions(module: MonitorModule): { allowed: boolean; blockers: string[]; degraded?: boolean; degradedReason?: string } {
  const blockers: string[] = [];
  let degraded = false;
  let degradedReason: string | undefined;

  if (module === 'file') {
    // File monitoring requires readable Desktop/Downloads paths.
    const targets = [path.join(os.homedir(), 'Desktop'), path.join(os.homedir(), 'Downloads')];
    for (const target of targets) {
      try {
        fs.accessSync(target, fs.constants.R_OK);
      } catch {
        blockers.push(`Cannot read ${target}. Grant Files and Folders or Full Disk Access in System Settings > Privacy & Security.`);
      }
    }
  }

  if (module === 'process') {
    // Process listing via psutil/sysctl works without special permissions on macOS.
    // Smoke-test that basic process enumeration is functional.
    if (process.platform === 'darwin') {
      try {
        execSync('ps -e -o pid=', { stdio: 'ignore', timeout: 3000 });
      } catch {
        blockers.push('Cannot list processes. Check that the app has not been restricted by parental controls or MDM.');
      }
    }
  }

  if (module === 'network') {
    // Network connection listing works via netstat without root on macOS,
    // but per-process socket attribution requires root/elevated privileges.
    // We allow it to start but flag the degraded state.
    if (process.platform === 'darwin') {
      try {
        execSync('netstat -an -p tcp', { stdio: 'ignore', timeout: 3000 });
      } catch {
        blockers.push('Cannot read network connections.');
      }
      // Even when netstat works, psutil cannot attribute connections to processes without root.
      degraded = true;
      degradedReason = 'Network monitoring runs in limited mode: connections are visible but process attribution is unavailable without elevated privileges.';
    }
  }

  return { allowed: blockers.length === 0, blockers, degraded, degradedReason };
}

async function setMonitorDesired(module: MonitorModule, enabled: boolean) {
  const desired = readMonitorDesired();
  const state = readMonitorStateMap();
  const blockers = readMonitorBlockers();

  desired[module] = enabled;

  if (!enabled) {
    state[module] = 'off';
    blockers[module] = [];
    writeMonitorState(desired, state, blockers);
    pythonBridge?.send({ type: 'update_preferences', data: moduleToPreferencePatch(module, false) });
    emitMonitorControlState();
    return buildMonitorControlState();
  }

  state[module] = 'pending_permission';
  blockers[module] = [];
  writeMonitorState(desired, state, blockers);
  emitMonitorControlState();

  // Run real capability checks — no self-referential grants gate.
  const permissionResult = checkMonitorPermissions(module);
  if (!permissionResult.allowed) {
    state[module] = 'blocked';
    blockers[module] = permissionResult.blockers;
    writeMonitorState(desired, state, blockers);
    emitMonitorControlState();
    return buildMonitorControlState();
  }

  state[module] = 'running';
  blockers[module] = [];
  // If degraded, include the reason in blockers so the UI can display it.
  if (permissionResult.degraded && permissionResult.degradedReason) {
    blockers[module] = [permissionResult.degradedReason];
  }
  writeMonitorState(desired, state, blockers);
  pythonBridge?.send({ type: 'update_preferences', data: moduleToPreferencePatch(module, true) });
  emitMonitorControlState();
  return buildMonitorControlState();
}

function getDeviceMetadata() {
  const platformMap: Record<string, string> = {
    darwin: 'macos',
    win32: 'windows',
    linux: 'linux',
  };

  // Build a stable hardware-derived fingerprint that is hard to guess.
  const cpuModel = os.cpus()[0]?.model || 'unknown-cpu';
  const raw = `${os.hostname()}-${os.arch()}-${cpuModel}-${os.totalmem()}-${process.platform}`;
  const machineId = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);

  return {
    name: os.hostname(),
    os_type: platformMap[process.platform] || process.platform,
    os_version: os.release(),
    app_version: app.getVersion(),
    machine_id: machineId,
  };
}

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'HavenAI',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Start hidden, show when ready
    show: false,
    // Nice rounded corners on Mac
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Load the renderer
  if (isDev) {
    // In development, load from Next.js dev server
    mainWindow.loadURL(`http://localhost:${rendererDevPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/out/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window close - minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create the system tray icon
 */
function buildTrayMenu(): Menu {
  // Reflect the real monitor state instead of hardcoding "Active".
  const state = readMonitorStateMap();
  const running = MONITOR_MODULES.filter((m) => state[m] === 'running').length;
  const total = MONITOR_MODULES.length;
  const statusLabel =
    running === total
      ? 'All monitors running'
      : running === 0
      ? 'Monitoring paused'
      : `${running} of ${total} monitors running`;

  return Menu.buildFromTemplate([
    {
      label: 'Open HavenAI',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: statusLabel,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Start with System',
      type: 'checkbox',
      checked: store.get('startOnBoot', false) as boolean,
      click: (menuItem) => {
        store.set('startOnBoot', menuItem.checked);
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
        });
      },
    },
    {
      label: 'Check for updates…',
      click: () => {
        if (!app.isPackaged) {
          dialog.showMessageBox({
            type: 'info',
            message: 'Update checks are disabled in development mode.',
          });
          return;
        }
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          console.warn('Manual update check failed:', err?.message || err);
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit HavenAI',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function refreshTrayMenu(): void {
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
  }
}

function createTray(): void {
  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('HavenAI — protecting your system');

  tray.setContextMenu(buildTrayMenu());

  // Click on tray icon shows window
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
}

/**
 * Get the path to the app icon
 */
function getIconPath(): string {
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  if (isDev) {
    return path.join(__dirname, '../assets', iconName);
  }
  return path.join(process.resourcesPath, 'assets', iconName);
}

/**
 * Get the path to the tray icon
 */
function getTrayIconPath(): string {
  // Use a template image on Mac for proper dark/light mode support
  const iconName = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png';
  if (isDev) {
    return path.join(__dirname, '../assets', iconName);
  }
  return path.join(process.resourcesPath, 'assets', iconName);
}

/**
 * Show a native notification
 */
function showNotification(title: string, body: string, severity: string = 'medium'): void {
  const notification = new Notification({
    title,
    body,
    icon: getIconPath(),
    urgency: severity === 'critical' || severity === 'high' ? 'critical' : 'normal',
  });

  notification.on('click', () => {
    mainWindow?.show();
  });

  notification.show();
}

/**
 * Initialize the Python agent bridge
 */
function initPythonBridge(): void {
  pythonBridge = new PythonBridge();

  // Handle messages from Python
  pythonBridge.on('ready', () => {
    console.log('Python agent is ready');
    mainWindow?.webContents.send('agent-status', { status: 'running' });
    pythonBridge?.send({ type: 'get_status' });

    // If credentials were persisted, immediately hydrate Python session.
    const accessToken = decryptFromStore('accessToken');
    if (accessToken) {
      pythonBridge?.send({
        type: 'sync_auth',
        access_token: accessToken,
        refresh_token: decryptFromStore('refreshToken'),
        user: store.get('user') || {},
        device_id: store.get('deviceId') as string | undefined,
        device: getDeviceMetadata(),
      });
    }

    // Strict startup behavior: restore remembered local desired monitor states.
    const desired = readMonitorDesired();
    MONITOR_MODULES.forEach((module) => {
      if (desired[module]) {
        setMonitorDesired(module, true).catch(() => undefined);
      } else {
        pythonBridge?.send({ type: 'update_preferences', data: moduleToPreferencePatch(module, false) });
      }
    });
    emitMonitorControlState();

    // Restore email monitor credentials if saved (password encrypted via OS keychain)
    const savedEmail = store.get('emailMonitor') as any;
    const savedEmailPassword = decryptFromStore('emailMonitorPassword');
    if (savedEmail?.email && savedEmailPassword) {
      pythonBridge?.send({
        type: 'configure_email',
        data: {
          host: savedEmail.imapHost,
          port: savedEmail.imapPort,
          user: savedEmail.email,
          password: savedEmailPassword,
        },
      });
    }
  });

  pythonBridge.on('alert', (alert: any) => {
    console.log('Alert received:', alert.type);
    
    // Show native notification
    showNotification(
      alert.title || 'Security Alert',
      alert.description || 'A potential threat was detected',
      alert.severity
    );

    // Send to renderer
    mainWindow?.webContents.send('new-alert', alert);
  });

  pythonBridge.on('status', (status: any) => {
    if (status?.device_id) {
      store.set('deviceId', status.device_id);
    }
    // Keep local monitor state in sync with actual runtime state from Python.
    const desired = readMonitorDesired();
    const state = readMonitorStateMap();
    const blockers = readMonitorBlockers();
    const enabled = status?.enabled_modules || {};
    const byModule: Record<MonitorModule, boolean> = {
      file: Boolean(enabled.file_monitoring_enabled),
      process: Boolean(enabled.process_monitoring_enabled),
      network: Boolean(enabled.network_monitoring_enabled),
    };
    let changed = false;
    MONITOR_MODULES.forEach((module) => {
      if (byModule[module]) {
        if (state[module] !== 'running') {
          state[module] = 'running';
          blockers[module] = [];
          changed = true;
        }
      } else if (!desired[module] && state[module] !== 'off') {
        state[module] = 'off';
        blockers[module] = [];
        changed = true;
      }
    });
    if (changed) {
      writeMonitorState(desired, state, blockers);
      emitMonitorControlState();
    }
    mainWindow?.webContents.send('agent-status', status);
  });

  pythonBridge.on('login-success', (data: any) => {
    if (data?.device_id) {
      store.set('deviceId', data.device_id);
    }
    mainWindow?.webContents.send('agent-auth', { status: 'success', ...data });
  });

  pythonBridge.on('login-error', (error: string) => {
    mainWindow?.webContents.send('agent-auth', { status: 'error', error });
  });

  pythonBridge.on('auth-synced', (data: any) => {
    if (data?.device_id) {
      store.set('deviceId', data.device_id);
    }
    mainWindow?.webContents.send('agent-auth', { status: 'synced', ...data });
  });

  pythonBridge.on('email-config-result', (data: any) => {
    mainWindow?.webContents.send('email-config-result', data);
  });

  pythonBridge.on('local-events', (data: any) => {
    mainWindow?.webContents.send('local-events', data);
  });

  pythonBridge.on('local-alerts', (data: any) => {
    mainWindow?.webContents.send('local-alerts', data);
  });

  pythonBridge.on('local-stats', (data: any) => {
    mainWindow?.webContents.send('local-stats', data);
  });

  pythonBridge.on('preferences-applied', (data: any) => {
    mainWindow?.webContents.send('agent-preferences', data);
  });

  pythonBridge.on('device-registered', (data: any) => {
    if (data?.device_id) {
      store.set('deviceId', data.device_id);
    }
    mainWindow?.webContents.send('agent-device', data);
  });

  pythonBridge.on('device-linked-error', (message: string) => {
    // Device is linked to another account — clear credentials and notify renderer
    deleteFromStore('accessToken');
    deleteFromStore('refreshToken');
    store.delete('user');
    store.delete('deviceId');
    mainWindow?.webContents.send('device-linked-error', message);
  });

  pythonBridge.on('device-unlinked', (data: any) => {
    // Device fully unlinked — clear all account-scoped local state so a
    // fresh account on this machine doesn't inherit email creds, monitor
    // preferences, or session tokens.
    deleteFromStore('accessToken');
    deleteFromStore('refreshToken');
    store.delete('user');
    store.delete('deviceId');
    store.delete('emailMonitor');
    deleteFromStore('emailMonitorPassword');
    const resetDesired: MonitorDesired = { file: false, process: false, network: false };
    const resetState: MonitorStateMap = { file: 'off', process: 'off', network: 'off' };
    const resetBlockers: MonitorBlockers = { file: [], process: [], network: [] };
    store.set('monitorDesired', resetDesired);
    store.set('monitorState', resetState);
    store.set('monitorBlockers', resetBlockers);
    // Setup was machine-scoped; keep setupCompleted but force the new user
    // back through the welcome + setup flow.
    store.set('setupSkipped', false);
    mainWindow?.webContents.send('device-unlinked', data);
  });

  pythonBridge.on('error', (error: string) => {
    console.error('Python bridge error:', error);
    mainWindow?.webContents.send('agent-status', { status: 'error', error });
  });

  pythonBridge.on('exit', (code: number) => {
    console.log('Python agent exited with code:', code);
    mainWindow?.webContents.send('agent-status', { status: 'stopped', code });
  });

  pythonBridge.on('unresponsive', (silenceMs: number) => {
    console.warn(`Python agent unresponsive (silent ${silenceMs}ms)`);
    mainWindow?.webContents.send('agent-status', { status: 'unresponsive', silenceMs });
  });

  pythonBridge.on('responsive', () => {
    console.log('Python agent responsive again');
    mainWindow?.webContents.send('agent-status', { status: 'running' });
  });

  // Start the Python agent
  pythonBridge.start();
}

// ============== IPC Handlers ==============

// Get agent status
ipcMain.handle('get-agent-status', () => {
  return pythonBridge?.isRunning() ? 'running' : 'stopped';
});

// Start agent
ipcMain.handle('start-agent', () => {
  if (!pythonBridge?.isRunning()) {
    pythonBridge?.start();
  }
  return true;
});

// Stop agent
ipcMain.handle('stop-agent', () => {
  pythonBridge?.stop();
  return true;
});

// Get stored credentials (tokens are encrypted at rest)
ipcMain.handle('get-credentials', () => {
  return {
    accessToken: decryptFromStore('accessToken'),
    refreshToken: decryptFromStore('refreshToken'),
    user: store.get('user'),
    deviceId: store.get('deviceId'),
  };
});

// Save credentials (tokens encrypted via OS keychain)
ipcMain.handle('save-credentials', (_, credentials) => {
  if (credentials?.accessToken) {
    encryptAndStore('accessToken', credentials.accessToken);
  } else {
    deleteFromStore('accessToken');
  }

  if (credentials?.refreshToken) {
    encryptAndStore('refreshToken', credentials.refreshToken);
  } else {
    deleteFromStore('refreshToken');
  }

  if (credentials?.user) {
    store.set('user', credentials.user);
  } else {
    store.delete('user');
  }

  if (credentials?.deviceId) {
    store.set('deviceId', credentials.deviceId);
  } else {
    store.delete('deviceId');
  }
  return true;
});

// Clear credentials (logout)
ipcMain.handle('clear-credentials', () => {
  deleteFromStore('accessToken');
  deleteFromStore('refreshToken');
  store.delete('user');
  store.delete('deviceId');
  return true;
});

// App flags — per-install onboarding/setup tracking. Kept separate from
// credentials so logout doesn't wipe them (machine-level state).
ipcMain.handle('get-app-flags', () => {
  return {
    onboardedUsers: (store.get('onboardedUsers') as string[] | undefined) ?? [],
    setupCompleted: Boolean(store.get('setupCompleted') ?? false),
    setupSkipped: Boolean(store.get('setupSkipped') ?? false),
  };
});

ipcMain.handle('set-app-flags', (_, patch: Record<string, unknown>) => {
  if (patch && typeof patch === 'object') {
    if (Array.isArray(patch.onboardedUsers)) {
      // Store only unique, non-empty string ids.
      const unique = Array.from(
        new Set((patch.onboardedUsers as unknown[]).filter((x) => typeof x === 'string' && x)),
      ) as string[];
      store.set('onboardedUsers', unique);
    }
    if (typeof patch.setupCompleted === 'boolean') {
      store.set('setupCompleted', patch.setupCompleted);
    }
    if (typeof patch.setupSkipped === 'boolean') {
      store.set('setupSkipped', patch.setupSkipped);
    }
  }
  return true;
});

// Dev/support nuclear option — wipe every HavenAI key and reload. Used by
// the hidden "Hard reset" button in Settings, and at the tail end of
// device-unlink to guarantee a clean slate.
ipcMain.handle('hard-reset', async () => {
  try {
    pythonBridge?.send({ type: 'unlink_device' });
  } catch {
    // agent may already be dead; continue regardless
  }
  const keys = [
    'accessToken',
    'refreshToken',
    'user',
    'deviceId',
    'onboardedUsers',
    'setupCompleted',
    'setupSkipped',
    'monitorDesired',
    'monitorState',
    'monitorBlockers',
    'emailMonitor',
    'emailMonitorPassword',
    'startOnBoot',
  ];
  for (const k of keys) {
    try {
      store.delete(k as any);
    } catch {
      /* ignore */
    }
  }
  mainWindow?.webContents.reload();
  return true;
});

// Open an external URL in the user's default browser. Used by the
// device-linked-error banner's "Open web dashboard" button.
ipcMain.handle('open-external', async (_, url: string) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  try {
    await shell.openExternal(url);
    return true;
  } catch {
    return false;
  }
});

// Send message to Python agent
ipcMain.handle('send-to-agent', (_, message) => {
  pythonBridge?.send(message);
  return true;
});

ipcMain.handle('agent-login', (_, payload) => {
  pythonBridge?.send({
    type: 'login',
    email: payload?.email,
    password: payload?.password,
    device: getDeviceMetadata(),
  });
  return true;
});

ipcMain.handle('sync-agent-auth', (_, payload) => {
  if (payload?.accessToken) {
    encryptAndStore('accessToken', payload.accessToken);
  }
  if (payload?.refreshToken) {
    encryptAndStore('refreshToken', payload.refreshToken);
  }
  if (payload?.user) {
    store.set('user', payload.user);
  }

  pythonBridge?.send({
    type: 'sync_auth',
    access_token: payload?.accessToken,
    refresh_token: payload?.refreshToken,
    user: payload?.user || {},
    device_id: (store.get('deviceId') as string | undefined),
    device: getDeviceMetadata(),
  });
  return true;
});

ipcMain.handle('update-agent-preferences', (_, payload) => {
  pythonBridge?.send({ type: 'update_preferences', data: payload || {} });
  return true;
});

ipcMain.handle('get-monitor-control-state', () => buildMonitorControlState());

ipcMain.handle('check-monitor-permissions', (_, module: MonitorModule) => {
  return checkMonitorPermissions(module);
});

ipcMain.handle('set-monitor-desired', (_, payload: { module: MonitorModule; enabled: boolean }) => {
  if (!payload?.module || !MONITOR_MODULES.includes(payload.module)) {
    return buildMonitorControlState();
  }
  return setMonitorDesired(payload.module, Boolean(payload.enabled));
});

ipcMain.handle('grant-monitor-permission', async (_, module: MonitorModule) => {
  if (!module || !MONITOR_MODULES.includes(module)) {
    return buildMonitorControlState();
  }
  // Re-run the real permission check and attempt to start the monitor.
  // The user should have granted access in System Settings before clicking retry.
  return setMonitorDesired(module, true);
});

ipcMain.handle('agent-logout', () => {
  pythonBridge?.send({ type: 'logout' });
  // Reset device monitor state but keep device linked (deviceId stays)
  const resetDesired: MonitorDesired = { file: false, process: false, network: false };
  const resetState: MonitorStateMap = { file: 'off', process: 'off', network: 'off' };
  const resetBlockers: MonitorBlockers = { file: [], process: [], network: [] };
  store.set('monitorDesired', resetDesired);
  store.set('monitorState', resetState);
  store.set('monitorBlockers', resetBlockers);
  // Note: deviceId is NOT deleted — device stays linked to account.
  // Email monitor config is NOT cleared — it's account-level.
  return true;
});

ipcMain.handle('unlink-device', () => {
  pythonBridge?.send({ type: 'unlink_device' });
  return true;
});

ipcMain.handle('configure-email-monitor', (_, payload) => {
  if (payload?.email && payload?.password) {
    // Store email config with encrypted password via OS keychain
    store.set('emailMonitor', {
      email: payload.email,
      imapHost: payload.imapHost,
      imapPort: payload.imapPort,
    });
    encryptAndStore('emailMonitorPassword', payload.password);
  }

  pythonBridge?.send({
    type: 'configure_email',
    data: {
      host: payload?.imapHost,
      port: payload?.imapPort,
      user: payload?.email,
      password: payload?.password,
    },
  });
  return true;
});

ipcMain.handle('disconnect-email-monitor', () => {
  store.delete('emailMonitor');
  deleteFromStore('emailMonitorPassword');
  pythonBridge?.send({ type: 'disconnect_email' });
  return true;
});

// Expose the stored email monitor config (WITHOUT the password) so the
// renderer can show "Connected to X" after a re-login without re-entering
// credentials.
ipcMain.handle('get-email-monitor-config', () => {
  const saved = store.get('emailMonitor') as any;
  if (!saved?.email) return null;
  return {
    email: saved.email,
    imapHost: saved.imapHost,
    imapPort: saved.imapPort,
  };
});

ipcMain.handle('query-local-events', (_, params) => {
  pythonBridge?.send({ type: 'query_events', data: params || {} });
  return true;
});

ipcMain.handle('query-local-alerts', (_, params) => {
  pythonBridge?.send({ type: 'query_alerts', data: params || {} });
  return true;
});

ipcMain.handle('get-local-stats', () => {
  pythonBridge?.send({ type: 'get_local_stats' });
  return true;
});

ipcMain.handle('open-permissions-settings', async (_, target?: 'file' | 'process' | 'network' | 'alerts' | 'all') => {
  if (process.platform === 'darwin') {
    const targetToUrls: Record<string, string[]> = {
      file: [
        // Full Disk Access is the most reliable way to ensure file monitoring works.
        'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
      ],
      process: [
        // Process monitoring works without special permissions on macOS.
        // Open the general Privacy & Security pane as a reference.
        'x-apple.systempreferences:com.apple.preference.security?Privacy',
      ],
      network: [
        // Network monitoring limitations are Unix privilege-based, not TCC.
        // Full Disk Access can help with broader socket visibility.
        'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
      ],
      alerts: [
        'x-apple.systempreferences:com.apple.preference.notifications',
      ],
      all: [
        'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
      ],
    };
    const urls = targetToUrls[target || 'all'] || targetToUrls.all;
    for (const url of urls) {
      try {
        await shell.openExternal(url);
      } catch {
        // Continue to next target if a deep-link is not supported.
      }
    }
    return true;
  }

  // Non-macOS fallback — open system settings.
  if (process.platform === 'win32') {
    try {
      await shell.openExternal('ms-settings:privacy');
      return true;
    } catch {
      return false;
    }
  }

  return false;
});

// ============== App Lifecycle ==============

// ============== Auto-update ==============
//
// Uses the GitHub Releases feed configured in package.json (build.publish).
// Only runs in packaged builds; dev mode is a no-op so local work doesn't
// try to hit GitHub every launch.
function setupAutoUpdater(): void {
  if (!app.isPackaged) {
    console.log('Auto-updater disabled in dev mode');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update…');
  });
  autoUpdater.on('update-available', (info) => {
    console.log(`Update available: ${info.version}`);
    mainWindow?.webContents.send('update-available', { version: info.version });
  });
  autoUpdater.on('update-not-available', () => {
    console.log('App is up to date');
  });
  autoUpdater.on('error', (err) => {
    console.warn('Auto-updater error:', err?.message || err);
  });
  autoUpdater.on('download-progress', (progress) => {
    console.log(`Update download progress: ${Math.round(progress.percent)}%`);
  });
  autoUpdater.on('update-downloaded', async (info) => {
    console.log(`Update downloaded: ${info.version}`);
    mainWindow?.webContents.send('update-downloaded', { version: info.version });
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'HavenAI update ready',
      message: `Version ${info.version} is ready to install.`,
      detail:
        'Restart HavenAI now to apply the update, or keep working and it will install the next time you quit the app.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) {
      isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });

  // Initial check shortly after launch + every 4 hours while running
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
  }, 10_000);
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => undefined);
  }, 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    try {
      app.dock.setIcon(getIconPath());
    } catch {
      // Non-fatal: dock icon is cosmetic
    }
  }
  createWindow();
  createTray();
  initPythonBridge();
  emitMonitorControlState();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // On Mac, keep app running in tray
  if (process.platform !== 'darwin') {
    // On other platforms, quit when all windows are closed
    // unless we're running in tray mode
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  pythonBridge?.stop();
});

// Handle certificate errors in development
if (isDev) {
  app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
    event.preventDefault();
    callback(true);
  });
}
