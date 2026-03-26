/**
 * HavenAI Desktop App - Main Process
 * 
 * This is the main Electron process that:
 * - Creates the application window
 * - Manages the system tray icon
 * - Spawns and communicates with the Python agent
 * - Shows native notifications
 */

import { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage, shell } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { PythonBridge } from './python-bridge';
import Store from 'electron-store';

// Persistent storage for settings
const store = new Store();

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
type MonitorPermissionGrants = Record<MonitorModule, boolean>;

const MONITOR_MODULES: MonitorModule[] = ['file', 'process', 'network'];
const DEFAULT_MONITOR_DESIRED: MonitorDesired = {
  file: false,
  process: false,
  network: false,
};
const DEFAULT_MONITOR_STATE: MonitorStateMap = {
  file: 'off',
  process: 'off',
  network: 'off',
};
const DEFAULT_MONITOR_BLOCKERS: MonitorBlockers = {
  file: [],
  process: [],
  network: [],
};
const DEFAULT_MONITOR_PERMISSION_GRANTS: MonitorPermissionGrants = {
  file: false,
  process: false,
  network: false,
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

function readMonitorPermissionGrants(): MonitorPermissionGrants {
  const raw = (store.get('monitorPermissionGrants') || {}) as Partial<MonitorPermissionGrants>;
  return {
    file: Boolean(raw.file),
    process: Boolean(raw.process),
    network: Boolean(raw.network),
  };
}

function writeMonitorState(
  desired: MonitorDesired,
  state: MonitorStateMap,
  blockers: MonitorBlockers,
  grants?: MonitorPermissionGrants,
) {
  store.set('monitorDesired', desired);
  store.set('monitorState', state);
  store.set('monitorBlockers', blockers);
  if (grants) {
    store.set('monitorPermissionGrants', grants);
  }
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
    grants: readMonitorPermissionGrants(),
    updated_at: new Date().toISOString(),
  };
}

function emitMonitorControlState() {
  mainWindow?.webContents.send('monitor-state', buildMonitorControlState());
}

function checkMonitorPermissions(module: MonitorModule): { allowed: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const grants = readMonitorPermissionGrants();

  if (!grants[module]) {
    blockers.push('Access not granted yet. Use "Allow access and retry" to continue.');
    return { allowed: false, blockers };
  }

  // File monitoring requires readable Desktop/Downloads paths.
  if (module === 'file') {
    const targets = [path.join(os.homedir(), 'Desktop'), path.join(os.homedir(), 'Downloads')];
    for (const target of targets) {
      try {
        fs.accessSync(target, fs.constants.R_OK);
      } catch {
        blockers.push(`Cannot read ${target}. Grant Files and Folders / Full Disk Access.`);
      }
    }
  }

  // Process and network monitoring generally do not need a single explicit TCC gate.
  if (module === 'process' && process.platform === 'darwin') {
    blockers.push(...[]);
  }
  if (module === 'network' && process.platform === 'darwin') {
    blockers.push(...[]);
  }

  return { allowed: blockers.length === 0, blockers };
}

async function setMonitorDesired(module: MonitorModule, enabled: boolean) {
  const desired = readMonitorDesired();
  const state = readMonitorStateMap();
  const blockers = readMonitorBlockers();
  const grants = readMonitorPermissionGrants();

  desired[module] = enabled;

  if (!enabled) {
    state[module] = 'off';
    blockers[module] = [];
    writeMonitorState(desired, state, blockers, grants);
    pythonBridge?.send({ type: 'update_preferences', data: moduleToPreferencePatch(module, false) });
    emitMonitorControlState();
    return buildMonitorControlState();
  }

  state[module] = 'pending_permission';
  blockers[module] = [];
  writeMonitorState(desired, state, blockers, grants);
  emitMonitorControlState();

  const permissionResult = checkMonitorPermissions(module);
  if (!permissionResult.allowed) {
    state[module] = 'blocked';
    blockers[module] = permissionResult.blockers;
    writeMonitorState(desired, state, blockers, grants);
    emitMonitorControlState();
    return buildMonitorControlState();
  }

  state[module] = 'running';
  blockers[module] = [];
  writeMonitorState(desired, state, blockers, grants);
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

  return {
    name: os.hostname(),
    os_type: platformMap[process.platform] || process.platform,
    os_version: os.release(),
    app_version: app.getVersion(),
    machine_id: `${os.hostname()}-${os.arch()}`,
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
function createTray(): void {
  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('HavenAI - Protecting your system');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open HavenAI',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Protection Status',
      sublabel: 'Active',
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
    { type: 'separator' },
    {
      label: 'Quit HavenAI',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

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
    return path.join(__dirname, '../../assets', iconName);
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
    return path.join(__dirname, '../../assets', iconName);
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
    const accessToken = store.get('accessToken') as string | undefined;
    if (accessToken) {
      pythonBridge?.send({
        type: 'sync_auth',
        access_token: accessToken,
        refresh_token: store.get('refreshToken') as string | undefined,
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

    // Restore email monitor credentials if saved
    const savedEmail = store.get('emailMonitor') as any;
    if (savedEmail?.email && savedEmail?.password) {
      pythonBridge?.send({
        type: 'configure_email',
        data: {
          host: savedEmail.imapHost,
          port: savedEmail.imapPort,
          user: savedEmail.email,
          password: Buffer.from(savedEmail.password, 'base64').toString('utf-8'),
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

  pythonBridge.on('error', (error: string) => {
    console.error('Python bridge error:', error);
    mainWindow?.webContents.send('agent-status', { status: 'error', error });
  });

  pythonBridge.on('exit', (code: number) => {
    console.log('Python agent exited with code:', code);
    mainWindow?.webContents.send('agent-status', { status: 'stopped', code });
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

// Get stored credentials
ipcMain.handle('get-credentials', () => {
  return {
    accessToken: store.get('accessToken'),
    refreshToken: store.get('refreshToken'),
    user: store.get('user'),
    deviceId: store.get('deviceId'),
  };
});

// Save credentials
ipcMain.handle('save-credentials', (_, credentials) => {
  if (credentials?.accessToken) {
    store.set('accessToken', credentials.accessToken);
  } else {
    store.delete('accessToken');
  }

  if (credentials?.refreshToken) {
    store.set('refreshToken', credentials.refreshToken);
  } else {
    store.delete('refreshToken');
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
  store.delete('accessToken');
  store.delete('refreshToken');
  store.delete('user');
  store.delete('deviceId');
  return true;
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
    store.set('accessToken', payload.accessToken);
  }
  if (payload?.refreshToken) {
    store.set('refreshToken', payload.refreshToken);
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

ipcMain.handle('grant-monitor-permission', (_, module: MonitorModule) => {
  if (!module || !MONITOR_MODULES.includes(module)) {
    return buildMonitorControlState();
  }
  const desired = readMonitorDesired();
  const state = readMonitorStateMap();
  const blockers = readMonitorBlockers();
  const grants = readMonitorPermissionGrants();
  grants[module] = true;
  if (state[module] === 'blocked') {
    state[module] = 'pending_permission';
    blockers[module] = [];
  }
  writeMonitorState(desired, state, blockers, grants);
  emitMonitorControlState();
  return buildMonitorControlState();
});

ipcMain.handle('agent-logout', () => {
  pythonBridge?.send({ type: 'logout' });
  store.delete('deviceId');
  return true;
});

ipcMain.handle('configure-email-monitor', (_, payload) => {
  if (payload?.email && payload?.password) {
    store.set('emailMonitor', {
      email: payload.email,
      imapHost: payload.imapHost,
      imapPort: payload.imapPort,
      password: Buffer.from(payload.password).toString('base64'),
    });
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
        'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
        'x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders',
      ],
      process: [
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
      ],
      network: [
        'x-apple.systempreferences:com.apple.preference.security?Privacy_LocalNetwork',
      ],
      alerts: [
        'x-apple.systempreferences:com.apple.preference.notifications',
      ],
      all: [
        'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles',
        'x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders',
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
        'x-apple.systempreferences:com.apple.preference.security?Privacy_LocalNetwork',
        'x-apple.systempreferences:com.apple.preference.notifications',
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

  // Non-macOS fallback.
  try {
    await shell.openExternal('https://support.apple.com/guide/mac-help/control-access-to-files-and-folders-on-mac-mchld5a35146/mac');
    return true;
  } catch {
    return false;
  }
});

// ============== App Lifecycle ==============

app.whenReady().then(() => {
  createWindow();
  createTray();
  initPythonBridge();
  emitMonitorControlState();

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
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });
}
