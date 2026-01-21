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
      removeAllListeners: (channel: string) => void;
      platform: string;
      isPackaged: boolean;
    };
  }
}
