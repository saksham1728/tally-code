/**
 * Cloud Client Module
 * 
 * WebSocket client for connecting to cloud backend
 * Handles bidirectional communication with auto-reconnect
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class CloudClient {
  constructor(endpoint, authManager, logger) {
    this.endpoint = endpoint;
    this.authManager = authManager;
    this.logger = logger;
    
    this.ws = null;
    this.isConnected = false;
    this.reconnectInterval = 5000; // 5 seconds
    this.reconnectTimer = null;
    this.heartbeatInterval = 30000; // 30 seconds
    this.heartbeatTimer = null;
    
    // Pending requests (for request-response pattern)
    this.pendingRequests = new Map();
    
    // Message handlers
    this.messageHandlers = new Map();
  }
  
  /**
   * Connect to cloud WebSocket server
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.logger.warn('Already connected to cloud');
        return;
      }
      
      this.logger.info('Connecting to cloud', { endpoint: this.endpoint });
      
      const token = this.authManager.getToken();
      if (!token) {
        throw new Error('No auth token available');
      }
      
      // Create WebSocket connection with auth token
      const wsUrl = `${this.endpoint}/ws?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);
      
      // Setup event handlers
      this.ws.on('open', () => this.onOpen());
      this.ws.on('message', (data) => this.onMessage(data));
      this.ws.on('error', (error) => this.onError(error));
      this.ws.on('close', () => this.onClose());
      
    } catch (error) {
      this.logger.error('Failed to connect to cloud', { error: error.message });
      this.scheduleReconnect();
    }
  }
  
  /**
   * WebSocket open event
   */
  onOpen() {
    this.logger.info('Connected to cloud successfully');
    this.isConnected = true;
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Authenticate
    this.authenticate();
  }
  
  /**
   * WebSocket message event
   * @param {Buffer|string} data 
   */
  onMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      this.logger.debug('Received message from cloud', { 
        type: message.type,
        requestId: message.requestId
      });
      
      // Handle response for pending request
      if (message.requestId && this.pendingRequests.has(message.requestId)) {
        const { resolve, reject, timeout } = this.pendingRequests.get(message.requestId);
        clearTimeout(timeout);
        this.pendingRequests.delete(message.requestId);
        
        if (message.success !== false) {
          resolve(message.payload);
        } else {
          reject(new Error(message.error || 'Request failed'));
        }
        return;
      }
      
      // Handle message type
      switch (message.type) {
        case 'AUTHENTICATED':
          this.onAuthenticated(message.payload);
          break;
        
        case 'FETCH_INVOICES_REQUEST':
          this.onFetchInvoicesRequest(message);
          break;
        
        case 'PUSH_INVOICE_REQUEST':
          this.onPushInvoiceRequest(message);
          break;
        
        case 'PONG':
          // Heartbeat response
          break;
        
        default:
          this.logger.warn('Unknown message type', { type: message.type });
      }
      
    } catch (error) {
      this.logger.error('Failed to process message', { error: error.message });
    }
  }
  
  /**
   * WebSocket error event
   * @param {Error} error 
   */
  onError(error) {
    this.logger.error('WebSocket error', { error: error.message });
  }
  
  /**
   * WebSocket close event
   */
  onClose() {
    this.logger.warn('Disconnected from cloud');
    this.isConnected = false;
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Schedule reconnect
    this.scheduleReconnect();
  }
  
  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }
    
    this.logger.info(`Reconnecting in ${this.reconnectInterval}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }
  
  /**
   * Disconnect from cloud
   */
  disconnect() {
    this.logger.info('Disconnecting from cloud');
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }
  
  /**
   * Send authentication message
   */
  authenticate() {
    const token = this.authManager.getToken();
    const user = this.authManager.getCurrentUser();
    
    this.send('AUTHENTICATE', {
      token,
      user
    });
  }
  
  /**
   * Handle authenticated event
   * @param {Object} payload 
   */
  onAuthenticated(payload) {
    this.logger.info('Authenticated with cloud', { user: payload.user });
  }
  
  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('PING', {});
      }
    }, this.heartbeatInterval);
  }
  
  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  /**
   * Send message to cloud
   * @param {string} type 
   * @param {Object} payload 
   * @param {string} requestId 
   */
  send(type, payload, requestId = null) {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to cloud');
    }
    
    const message = {
      type,
      requestId: requestId || uuidv4(),
      payload
    };
    
    this.logger.debug('Sending message to cloud', { 
      type, 
      requestId: message.requestId 
    });
    
    this.ws.send(JSON.stringify(message));
  }
  
  /**
   * Send request and wait for response
   * @param {string} type 
   * @param {Object} payload 
   * @param {number} timeout 
   * @returns {Promise<Object>}
   */
  sendRequest(type, payload, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const requestId = uuidv4();
      
      // Set timeout
      const timeoutTimer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, timeout);
      
      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutTimer
      });
      
      // Send message
      try {
        this.send(type, payload, requestId);
      } catch (error) {
        clearTimeout(timeoutTimer);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }
  
  /**
   * Handle fetch invoices request from cloud
   * @param {Object} message 
   */
  async onFetchInvoicesRequest(message) {
    this.logger.info('Received fetch invoices request from cloud');
    
    // Emit event to sync engine
    if (this.messageHandlers.has('FETCH_INVOICES_REQUEST')) {
      const handler = this.messageHandlers.get('FETCH_INVOICES_REQUEST');
      try {
        const invoices = await handler(message.payload);
        
        // Send response
        this.send('FETCH_INVOICES_RESPONSE', {
          success: true,
          invoices
        }, message.requestId);
        
      } catch (error) {
        this.logger.error('Failed to fetch invoices', { error: error.message });
        
        this.send('FETCH_INVOICES_RESPONSE', {
          success: false,
          error: error.message
        }, message.requestId);
      }
    }
  }
  
  /**
   * Handle push invoice request from cloud
   * @param {Object} message 
   */
  async onPushInvoiceRequest(message) {
    this.logger.info('Received push invoice request from cloud');
    
    // Emit event to sync engine
    if (this.messageHandlers.has('PUSH_INVOICE_REQUEST')) {
      const handler = this.messageHandlers.get('PUSH_INVOICE_REQUEST');
      try {
        const result = await handler(message.payload);
        
        // Send response
        this.send('PUSH_INVOICE_RESPONSE', {
          success: true,
          result
        }, message.requestId);
        
      } catch (error) {
        this.logger.error('Failed to push invoice', { error: error.message });
        
        this.send('PUSH_INVOICE_RESPONSE', {
          success: false,
          error: error.message
        }, message.requestId);
      }
    }
  }
  
  /**
   * Register message handler
   * @param {string} type 
   * @param {Function} handler 
   */
  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }
  
  /**
   * Remove message handler
   * @param {string} type 
   */
  off(type) {
    this.messageHandlers.delete(type);
  }
  
  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnectionActive() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = CloudClient;
