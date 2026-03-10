/**
 * HavenAI Desktop App - Main Process
 * 
 * This is the main Electron process that:
 * - Creates the application window
 * - Manages the system tray icon
 * - Spawns and communicates with the Python agent
 * - Shows native notifications
 */

import { app, BrowserWindow, Tray, Menu, ipcMain, Notification, nativeImage } from 'electron';
import * as path from 'path';
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
  store.set('accessToken', credentials.accessToken);
  store.set('refreshToken', credentials.refreshToken);
  store.set('user', credentials.user);
  store.set('deviceId', credentials.deviceId);
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

// ============== App Lifecycle ==============

app.whenReady().then(() => {
  createWindow();
  createTray();
  initPythonBridge();

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
