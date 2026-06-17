/**
 * Sync Engine Module
 * 
 * Orchestrates automatic synchronization between Tally and Cloud
 * Handles auto-sync timer, manual sync, and status updates
 */

const { EventEmitter } = require('events');

class SyncEngine extends EventEmitter {
  constructor(tallyConnector, cloudClient, configManager, logger) {
    super();
    
    this.tallyConnector = tallyConnector;
    this.cloudClient = cloudClient;
    this.config = configManager;
    this.logger = logger;
    
    this.syncTimer = null;
    this.isSyncing = false;
    this.isRunning = false;
    
    // Stats
    this.stats = {
      lastSyncTime: this.config.get('lastSyncTime'),
      syncCount: this.config.get('syncCount') || 0,
      lastSyncStatus: null,
      lastError: null
    };
    
    // Register cloud message handlers
    this.setupCloudHandlers();
  }
  
  /**
   * Setup cloud message handlers
   */
  setupCloudHandlers() {
    // Handle fetch invoices request from cloud
    this.cloudClient.on('FETCH_INVOICES_REQUEST', async (payload) => {
      const { startDate, endDate } = payload;
      return await this.tallyConnector.fetchInvoices(
        new Date(startDate), 
        new Date(endDate)
      );
    });
    
    // Handle push invoice request from cloud
    this.cloudClient.on('PUSH_INVOICE_REQUEST', async (payload) => {
      const { invoice } = payload;
      return await this.tallyConnector.pushInvoice(invoice);
    });
  }
  
  /**
   * Start sync engine
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('Sync engine already running');
      return;
    }
    
    this.logger.info('Starting sync engine');
    this.isRunning = true;
    
    // Connect to cloud
    this.cloudClient.connect();
    
    // Start auto-sync timer
    const syncInterval = this.config.get('syncInterval');
    this.syncTimer = setInterval(() => {
      this.sync();
    }, syncInterval);
    
    // Run initial sync after 5 seconds
    setTimeout(() => {
      this.sync();
    }, 5000);
    
    this.updateStatus('connected');
  }
  
  /**
   * Stop sync engine
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    this.logger.info('Stopping sync engine');
    this.isRunning = false;
    
    // Stop timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Disconnect cloud
    this.cloudClient.disconnect();
    
    this.updateStatus('disconnected');
  }
  
  /**
   * Perform sync operation
   */
  async sync() {
    if (this.isSyncing) {
      this.logger.debug('Sync already in progress, skipping');
      return;
    }
    
    if (!this.cloudClient.isConnectionActive()) {
      this.logger.warn('Cloud not connected, skipping sync');
      return;
    }
    
    this.isSyncing = true;
    this.updateStatus('syncing');
    
    try {
      this.logger.info('Starting sync cycle');
      
      // Step 1: Test Tally connection
      const tallyStatus = await this.tallyConnector.testConnection();
      if (!tallyStatus.success) {
        throw new Error(`Tally connection failed: ${tallyStatus.message}`);
      }
      
      // Step 2: Fetch new invoices from Tally
      const lastSyncTime = this.stats.lastSyncTime 
        ? new Date(this.stats.lastSyncTime) 
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      
      const now = new Date();
      const invoices = await this.tallyConnector.fetchInvoices(lastSyncTime, now);
      
      this.logger.info(`Fetched ${invoices.length} invoices from Tally`);
      
      // Step 3: Send invoices to cloud (if any)
      if (invoices.length > 0) {
        await this.cloudClient.sendRequest('SYNC_INVOICES', {
          invoices
        });
        
        this.logger.info('Invoices sent to cloud successfully');
      }
      
      // Step 4: Update stats
      this.stats.lastSyncTime = now.toISOString();
      this.stats.syncCount += invoices.length;
      this.stats.lastSyncStatus = 'success';
      this.stats.lastError = null;
      
      // Save to config
      this.config.set('lastSyncTime', this.stats.lastSyncTime);
      this.config.set('syncCount', this.stats.syncCount);
      
      this.logger.info('Sync cycle completed successfully', {
        invoicesCount: invoices.length,
        totalSynced: this.stats.syncCount
      });
      
      this.updateStatus('connected');
      this.emit('sync-complete', this.stats);
      
    } catch (error) {
      this.logger.error('Sync cycle failed', { error: error.message });
      
      this.stats.lastSyncStatus = 'error';
      this.stats.lastError = error.message;
      
      this.updateStatus('connected'); // Still connected, but sync failed
      this.emit('sync-error', { error: error.message });
      
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Manual sync (triggered by user)
   * @returns {Promise<void>}
   */
  async syncNow() {
    this.logger.info('Manual sync triggered');
    await this.sync();
  }
  
  /**
   * Update status and emit event
   * @param {string} status 
   */
  updateStatus(status) {
    this.emit('status-change', status);
  }
  
  /**
   * Get sync stats
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      isSyncing: this.isSyncing
    };
  }
  
  /**
   * Reset sync stats
   */
  resetStats() {
    this.stats = {
      lastSyncTime: null,
      syncCount: 0,
      lastSyncStatus: null,
      lastError: null
    };
    
    this.config.set('lastSyncTime', null);
    this.config.set('syncCount', 0);
    
    this.logger.info('Sync stats reset');
  }
}

module.exports = SyncEngine;
