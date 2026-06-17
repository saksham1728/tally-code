/**
 * Tally Bridge - Main Process
 * 
 * Electron main process that handles:
 * - App lifecycle
 * - System tray
 * - Window management
 * - IPC communication
 * - Background sync
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');

// Core modules
const Logger = require('./src/logger');
const ConfigManager = require('./src/config-manager');
const AuthManager = require('./src/auth-manager');
const TallyConnector = require('./src/tally-connector');
const CloudClient = require('./src/cloud-client');
const SyncEngine = require('./src/sync-engine');

// Global instances
let mainWindow = null;
let tray = null;
let logger = null;
let config = null;
let authManager = null;
let tallyConnector = null;
let cloudClient = null;
let syncEngine = null;

// App state
let isQuitting = false;
let currentStatus = 'disconnected'; // disconnected, connecting, connected, syncing

/**
 * Initialize core modules
 */
function initializeModules() {
  logger = new Logger();
  config = new ConfigManager();
  authManager = new AuthManager(config.get('cloudEndpoint'), logger);
  tallyConnector = new TallyConnector(config.get('tallyEndpoint'), logger);
  
  logger.info('Tally Bridge starting...', { version: app.getVersion() });
}

/**
 * Create system tray icon and menu
 */
function createTray() {
  // Create tray icon
  const iconPath = path.join(__dirname, 'build', 'icon-red.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  // Create tray menu
  updateTrayMenu();
  
  // Tray tooltip
  tray.setToolTip('Tally Bridge - Disconnected');
  
  // Double-click to open window
  tray.on('double-click', () => {
    showWindow();
  });
  
  logger.info('System tray created');
}

/**
 * Update tray menu based on current state
 */
function updateTrayMenu() {
  const isLoggedIn = authManager && authManager.isLoggedIn();
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Tally Bridge',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: showWindow,
      enabled: isLoggedIn
    },
    {
      label: 'Sync Now',
      click: manualSync,
      enabled: isLoggedIn && currentStatus === 'connected'
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: openSettings
    },
    {
      label: `Status: ${currentStatus}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: quitApp
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

/**
 * Update tray icon based on status
 * @param {string} status - disconnected, connecting, connected, syncing
 */
function updateTrayIcon(status) {
  currentStatus = status;
  
  const iconMap = {
    disconnected: 'icon-red.png',
    connecting: 'icon-yellow.png',
    connected: 'icon-green.png',
    syncing: 'icon-yellow.png'
  };
  
  const tooltipMap = {
    disconnected: 'Tally Bridge - Disconnected',
    connecting: 'Tally Bridge - Connecting...',
    connected: 'Tally Bridge - Connected',
    syncing: 'Tally Bridge - Syncing...'
  };
  
  const iconPath = path.join(__dirname, 'build', iconMap[status]);
  const icon = nativeImage.createFromPath(iconPath);
  tray.setImage(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip(tooltipMap[status]);
  
  updateTrayMenu();
  
  // Send status to renderer if window exists
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', { status });
  }
}

/**
 * Create main window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // Load login or dashboard based on auth state
  const isLoggedIn = authManager.isLoggedIn();
  const page = isLoggedIn ? 'index.html' : 'login.html';
  mainWindow.loadFile(path.join(__dirname, 'renderer', page));
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
  
  logger.info('Main window created');
}

/**
 * Show main window (or create if not exists)
 */
function showWindow() {
  if (mainWindow === null || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * Open settings window
 */
function openSettings() {
  showWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  }
}

/**
 * Manual sync triggered from tray
 */
function manualSync() {
  if (syncEngine) {
    logger.info('Manual sync triggered from tray');
    syncEngine.syncNow();
  }
}

/**
 * Quit application
 */
function quitApp() {
  isQuitting = true;
  
  // Stop sync engine
  if (syncEngine) {
    syncEngine.stop();
  }
  
  // Close WebSocket
  if (cloudClient) {
    cloudClient.disconnect();
  }
  
  logger.info('Tally Bridge shutting down...');
  app.quit();
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIPC() {
  // Login
  ipcMain.handle('login', async (event, credentials) => {
    try {
      logger.info('Login attempt', { email: credentials.email });
      const result = await authManager.login(credentials.email, credentials.password);
      
      if (result.success) {
        // Start sync engine after successful login
        startSyncEngine();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      logger.error('Login failed', { error: error.message });
      return { success: false, error: error.message };
    }
  });
  
  // Logout
  ipcMain.handle('logout', async () => {
    try {
      logger.info('Logout requested');
      
      // Stop sync engine
      if (syncEngine) {
        syncEngine.stop();
      }
      
      // Disconnect cloud
      if (cloudClient) {
        cloudClient.disconnect();
      }
      
      // Clear auth
      await authManager.logout();
      
      // Update UI
      updateTrayIcon('disconnected');
      
      return { success: true };
    } catch (error) {
      logger.error('Logout failed', { error: error.message });
      return { success: false, error: error.message };
    }
  });
  
  // Get config
  ipcMain.handle('get-config', async () => {
    return config.getAll();
  });
  
  // Save config
  ipcMain.handle('save-config', async (event, newConfig) => {
    try {
      Object.keys(newConfig).forEach(key => {
        config.set(key, newConfig[key]);
      });
      logger.info('Config updated');
      return { success: true };
    } catch (error) {
      logger.error('Config save failed', { error: error.message });
      return { success: false, error: error.message };
    }
  });
  
  // Manual sync
  ipcMain.handle('sync-now', async () => {
    try {
      if (syncEngine) {
        logger.info('Manual sync triggered from UI');
        await syncEngine.syncNow();
        return { success: true };
      } else {
        return { success: false, error: 'Sync engine not initialized' };
      }
    } catch (error) {
      logger.error('Manual sync failed', { error: error.message });
      return { success: false, error: error.message };
    }
  });
  
  // Get sync stats
  ipcMain.handle('get-sync-stats', async () => {
    if (syncEngine) {
      return syncEngine.getStats();
    }
    return { lastSyncTime: null, syncCount: 0 };
  });
  
  // Test Tally connection
  ipcMain.handle('test-tally', async () => {
    try {
      const result = await tallyConnector.testConnection();
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });
  
  // Open portal in browser
  ipcMain.handle('open-portal', async () => {
    const { shell } = require('electron');
    const portalUrl = config.get('cloudEndpoint').replace('ws://', 'http://').replace('wss://', 'https://');
    shell.openExternal(portalUrl);
  });
  
  logger.info('IPC handlers registered');
}

/**
 * Start sync engine after login
 */
function startSyncEngine() {
  try {
    // Initialize cloud client
    const cloudEndpoint = config.get('cloudEndpoint');
    cloudClient = new CloudClient(cloudEndpoint, authManager, logger);
    
    // Initialize sync engine
    syncEngine = new SyncEngine(tallyConnector, cloudClient, config, logger);
    
    // Listen to status updates
    syncEngine.on('status-change', (status) => {
      updateTrayIcon(status);
    });
    
    // Start syncing
    syncEngine.start();
    
    logger.info('Sync engine started');
  } catch (error) {
    logger.error('Failed to start sync engine', { error: error.message });
  }
}

/**
 * App ready event
 */
app.whenReady().then(() => {
  // Prevent multiple instances
  const gotTheLock = app.requestSingleInstanceLock();
  
  if (!gotTheLock) {
    logger.info('Another instance is already running. Quitting...');
    app.quit();
    return;
  }
  
  // Focus existing window if second instance tries to start
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  
  // Initialize
  initializeModules();
  createTray();
  setupIPC();
  createWindow();
  
  // Auto-start sync if already logged in
  if (authManager.isLoggedIn()) {
    startSyncEngine();
  }
});

/**
 * All windows closed
 */
app.on('window-all-closed', () => {
  // Keep app running in system tray (don't quit on macOS)
  // App will quit when user clicks Quit from tray menu
});

/**
 * Activate app (macOS)
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/**
 * Before quit
 */
app.on('before-quit', () => {
  isQuitting = true;
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  if (logger) {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  }
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  if (logger) {
    logger.error('Unhandled rejection', { error: error.message });
  }
  console.error('Unhandled rejection:', error);
});
