/**
 * Config Manager Module
 * 
 * Manages application configuration using electron-store
 * Configuration is persisted across app restarts
 */

const Store = require('electron-store');

class ConfigManager {
  constructor() {
    this.store = new Store({
      name: 'config',
      defaults: {
        // Tally settings
        tallyEndpoint: 'http://localhost:9000',
        
        // Cloud settings
        cloudEndpoint: 'ws://localhost:3000',
        
        // Sync settings
        syncInterval: 900000, // 15 minutes in milliseconds
        autoSync: true,
        
        // App settings
        autoStart: true,
        logLevel: 'info',
        
        // Sync state
        lastSyncTime: null,
        syncCount: 0,
        
        // User preferences
        minimizeToTray: true,
        showNotifications: true
      }
    });
  }
  
  /**
   * Get config value by key
   * @param {string} key 
   * @returns {any}
   */
  get(key) {
    return this.store.get(key);
  }
  
  /**
   * Set config value
   * @param {string} key 
   * @param {any} value 
   */
  set(key, value) {
    this.store.set(key, value);
  }
  
  /**
   * Get all config
   * @returns {Object}
   */
  getAll() {
    return this.store.store;
  }
  
  /**
   * Set multiple config values
   * @param {Object} config 
   */
  setMultiple(config) {
    Object.keys(config).forEach(key => {
      this.set(key, config[key]);
    });
  }
  
  /**
   * Check if key exists
   * @param {string} key 
   * @returns {boolean}
   */
  has(key) {
    return this.store.has(key);
  }
  
  /**
   * Delete config value
   * @param {string} key 
   */
  delete(key) {
    this.store.delete(key);
  }
  
  /**
   * Clear all config (reset to defaults)
   */
  clear() {
    this.store.clear();
  }
  
  /**
   * Get config file path
   * @returns {string}
   */
  getPath() {
    return this.store.path;
  }
}

module.exports = ConfigManager;
