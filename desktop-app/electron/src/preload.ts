/**
 * Preload Script
 * 
 * This runs in the renderer process but has access to Node.js APIs.
 * It exposes a safe API to the renderer via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('havenai', {
  // Agent control
  getAgentStatus: () => ipcRenderer.invoke('get-agent-status'),
  startAgent: () => ipcRenderer.invoke('start-agent'),
  stopAgent: () => ipcRenderer.invoke('stop-agent'),
  sendToAgent: (message: object) => ipcRenderer.invoke('send-to-agent', message),
  loginAgent: (payload: { email: string; password: string }) => ipcRenderer.invoke('agent-login', payload),
  syncAgentAuth: (payload: {
    accessToken: string;
    refreshToken?: string;
    user?: any;
  }) => ipcRenderer.invoke('sync-agent-auth', payload),
  updateAgentPreferences: (payload: {
    file_monitoring_enabled?: boolean;
    process_monitoring_enabled?: boolean;
    network_monitoring_enabled?: boolean;
  }) => ipcRenderer.invoke('update-agent-preferences', payload),
  getMonitorControlState: () => ipcRenderer.invoke('get-monitor-control-state'),
  checkMonitorPermissions: (module: 'file' | 'process' | 'network') =>
    ipcRenderer.invoke('check-monitor-permissions', module),
  setMonitorDesired: (payload: { module: 'file' | 'process' | 'network'; enabled: boolean }) =>
    ipcRenderer.invoke('set-monitor-desired', payload),
  grantMonitorPermission: (module: 'file' | 'process' | 'network') =>
    ipcRenderer.invoke('grant-monitor-permission', module),
  logoutAgent: () => ipcRenderer.invoke('agent-logout'),
  openPermissionsSettings: (target?: 'file' | 'process' | 'network' | 'alerts' | 'all') =>
    ipcRenderer.invoke('open-permissions-settings', target),
  configureEmailMonitor: (payload: { email: string; password: string; imapHost: string; imapPort: number }) =>
    ipcRenderer.invoke('configure-email-monitor', payload),
  queryLocalEvents: (params: { kind?: string; since?: number; limit?: number }) =>
    ipcRenderer.invoke('query-local-events', params),
  queryLocalAlerts: (params: { since?: number; severityMin?: string; limit?: number }) =>
    ipcRenderer.invoke('query-local-alerts', params),
  getLocalStats: () => ipcRenderer.invoke('get-local-stats'),

  // Credentials
  getCredentials: () => ipcRenderer.invoke('get-credentials'),
  saveCredentials: (credentials: object) => ipcRenderer.invoke('save-credentials', credentials),
  clearCredentials: () => ipcRenderer.invoke('clear-credentials'),

  // Event listeners
  onNewAlert: (callback: (alert: any) => void) => {
    ipcRenderer.on('new-alert', (_, alert) => callback(alert));
  },
  onAgentStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('agent-status', (_, status) => callback(status));
  },
  onAgentAuth: (callback: (auth: any) => void) => {
    ipcRenderer.on('agent-auth', (_, auth) => callback(auth));
  },
  onAgentPreferences: (callback: (prefs: any) => void) => {
    ipcRenderer.on('agent-preferences', (_, prefs) => callback(prefs));
  },
  onAgentDevice: (callback: (device: any) => void) => {
    ipcRenderer.on('agent-device', (_, device) => callback(device));
  },
  onMonitorState: (callback: (state: any) => void) => {
    ipcRenderer.on('monitor-state', (_, state) => callback(state));
  },
  onEmailConfigResult: (callback: (result: any) => void) => {
    ipcRenderer.on('email-config-result', (_, result) => callback(result));
  },
  onLocalEvents: (callback: (data: any) => void) => {
    ipcRenderer.on('local-events', (_, data) => callback(data));
  },
  onLocalAlerts: (callback: (data: any) => void) => {
    ipcRenderer.on('local-alerts', (_, data) => callback(data));
  },
  onLocalStats: (callback: (data: any) => void) => {
    ipcRenderer.on('local-stats', (_, data) => callback(data));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Platform info
  platform: process.platform,
  isPackaged: process.env.NODE_ENV !== 'development',
});

// TypeScript declaration for the exposed API
declare global {
  interface Window {
    havenai: {
      getAgentStatus: () => Promise<string>;
      startAgent: () => Promise<boolean>;
      stopAgent: () => Promise<boolean>;
      sendToAgent: (message: object) => Promise<boolean>;
      loginAgent: (payload: { email: string; password: string }) => Promise<boolean>;
      syncAgentAuth: (payload: {
        accessToken: string;
        refreshToken?: string;
        user?: any;
      }) => Promise<boolean>;
      updateAgentPreferences: (payload: {
        file_monitoring_enabled?: boolean;
        process_monitoring_enabled?: boolean;
        network_monitoring_enabled?: boolean;
      }) => Promise<boolean>;
      getMonitorControlState: () => Promise<any>;
      checkMonitorPermissions: (module: 'file' | 'process' | 'network') => Promise<any>;
      setMonitorDesired: (payload: { module: 'file' | 'process' | 'network'; enabled: boolean }) => Promise<any>;
      grantMonitorPermission: (module: 'file' | 'process' | 'network') => Promise<any>;
      logoutAgent: () => Promise<boolean>;
      openPermissionsSettings: (
        target?: 'file' | 'process' | 'network' | 'alerts' | 'all',
      ) => Promise<boolean>;
      getCredentials: () => Promise<{
        accessToken?: string;
        refreshToken?: string;
        user?: any;
        deviceId?: string;
      }>;
      saveCredentials: (credentials: object) => Promise<boolean>;
      clearCredentials: () => Promise<boolean>;
      onNewAlert: (callback: (alert: any) => void) => void;
      onAgentStatus: (callback: (status: any) => void) => void;
      onAgentAuth: (callback: (auth: any) => void) => void;
      onAgentPreferences: (callback: (prefs: any) => void) => void;
      onAgentDevice: (callback: (device: any) => void) => void;
      onMonitorState: (callback: (state: any) => void) => void;
      onEmailConfigResult: (callback: (result: any) => void) => void;
      onLocalEvents: (callback: (data: any) => void) => void;
      onLocalAlerts: (callback: (data: any) => void) => void;
      onLocalStats: (callback: (data: any) => void) => void;
      configureEmailMonitor: (payload: { email: string; password: string; imapHost: string; imapPort: number }) => Promise<boolean>;
      queryLocalEvents: (params: { kind?: string; since?: number; limit?: number }) => Promise<any>;
      queryLocalAlerts: (params: { since?: number; severityMin?: string; limit?: number }) => Promise<any>;
      getLocalStats: () => Promise<any>;
      removeAllListeners: (channel: string) => void;
      platform: string;
      isPackaged: boolean;
    };
  }
}
