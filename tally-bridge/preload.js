/**
 * Tally Bridge - Preload Script
 * 
 * Security bridge between main process and renderer process.
 * Exposes safe IPC APIs to the renderer with context isolation.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  logout: () => ipcRenderer.invoke('logout'),
  
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Sync operations
  syncNow: () => ipcRenderer.invoke('sync-now'),
  getSyncStats: () => ipcRenderer.invoke('get-sync-stats'),
  
  // Tally connection
  testTally: () => ipcRenderer.invoke('test-tally'),
  
  // External links
  openPortal: () => ipcRenderer.invoke('open-portal'),
  
  // Event listeners (one-way from main to renderer)
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, data) => callback(data));
  },
  
  onSyncComplete: (callback) => {
    ipcRenderer.on('sync-complete', (event, data) => callback(data));
  },
  
  onSyncError: (callback) => {
    ipcRenderer.on('sync-error', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeListener: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Log preload script loaded
console.log('Tally Bridge preload script loaded');
