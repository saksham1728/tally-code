/**
 * TallyConnector Implementation
 * 
 * Implements the IIntegrationConnector interface for Tally accounting software.
 * Handles connection testing, invoice import, and invoice push operations with
 * retry logic, exponential backoff, and circuit breaker pattern.
 * 
 * Requirements: 3.3, 4.1, 4.4, 9.1, 15.1, 15.5
 */

const axios = require('axios');
const IIntegrationConnector = require('./IIntegrationConnector');

class TallyConnector extends IIntegrationConnector {
  constructor() {
    super();
    this.name = 'Tally';
    
    // Circuit breaker state
    this.circuitState = 'closed'; // closed, open, half-open
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitOpenDuration = 60000; // 60 seconds
    this.maxFailures = 5;
    
    // Retry configuration (Requirements 15.5)
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
    this.requestTimeout = 10000; // 10 seconds per attempt
  }
  
  /**
   * Get connector name
   */
  getName() {
    return this.name;
  }
  
  /**
   * Check circuit breaker state
   * @returns {boolean} True if circuit is open (should not make requests)
   */
  isCircuitOpen() {
    if (this.circuitState === 'closed') {
      return false;
    }
    
    if (this.circuitState === 'open') {
      // Check if enough time has passed to try half-open
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.circuitOpenDuration) {
        this.circuitState = 'half-open';
        return false;
      }
      return true;
    }
    
    // half-open state: allow one request
    return false;
  }
  
  /**
   * Record successful request
   */
  recordSuccess() {
    this.failureCount = 0;
    this.circuitState = 'closed';
  }
  
  /**
   * Record failed request
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.maxFailures) {
      this.circuitState = 'open';
      console.log(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
  
  /**
   * Make HTTP request with retry logic and exponential backoff
   * 
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} data - Request body
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} Response data
   */
  async makeRequestWithRetry(method, url, data = null, headers = {}) {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      const error = new Error('Tally API circuit breaker is open. Service temporarily unavailable.');
      error.code = 'TALLY_UNAVAILABLE';
      throw error;
    }
    
    let lastError = null;
    
    // Retry loop (Requirements 15.5)
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const config = {
          method,
          url,
          timeout: this.requestTimeout,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        };
        
        if (data) {
          config.data = data;
        }
        
        const response = await axios(config);
        
        // Success - record and return
        this.recordSuccess();
        return response.data;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on 4xx errors (client errors)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          this.recordFailure();
          throw this.formatTallyError(error);
        }
        
        // Log retry attempt
        console.log(`Tally API request failed (attempt ${attempt + 1}/${this.maxRetries}):`, error.message);
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelays[attempt];
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    this.recordFailure();
    throw this.formatTallyError(lastError);
  }
  
  /**
   * Format Tally API error for consistent handling
   * 
   * @param {Error} error - Axios error object
   * @returns {Error} Formatted error
   */
  formatTallyError(error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      const formattedError = new Error('Tally API request timed out');
      formattedError.code = 'TALLY_TIMEOUT';
      return formattedError;
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      const formattedError = new Error('Unable to connect to Tally API');
      formattedError.code = 'TALLY_UNAVAILABLE';
      return formattedError;
    }
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      if (status === 401 || status === 403) {
        const formattedError = new Error('Tally authentication failed. Please check credentials.');
        formattedError.code = 'TALLY_AUTH_FAILED';
        return formattedError;
      }
      
      const formattedError = new Error(`Tally API error: ${message}`);
      formattedError.code = 'TALLY_ERROR';
      formattedError.statusCode = status;
      return formattedError;
    }
    
    const formattedError = new Error(error.message || 'Tally API request failed');
    formattedError.code = 'TALLY_ERROR';
    return formattedError;
  }
  
  /**
   * Test connectivity to Tally API (Requirement 3.3)
   * 
   * @param {Object} connectionConfig - Connection configuration
   * @returns {Promise<Object>} Result with success flag and message
   */
  async testConnection(connectionConfig) {
    // Validate configuration
    const validation = this.validateConfig(connectionConfig);
    if (!validation.isValid) {
      return {
        success: false,
        message: `Invalid configuration: ${validation.errors.join(', ')}`
      };
    }
    
    try {
      const { apiEndpoint, credentials } = connectionConfig;
      
      // Make a simple ping/health check request
      const url = `${apiEndpoint}/health`;
      const headers = {
        'Authorization': `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`
      };
      
      await this.makeRequestWithRetry('GET', url, null, headers);
      
      return {
        success: true,
        message: 'Connection to Tally successful'
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Import invoices from Tally (Requirement 4.1)
   * 
   * @param {Object} connectionConfig - Connection configuration
   * @param {Object} filters - Filter criteria
   * @param {Object} fieldMapping - Field mapping configuration
   * @returns {Promise<Array>} Array of standardized invoice objects
   */
  async importInvoices(connectionConfig, filters = {}, fieldMapping = null) {
    // Validate configuration
    const validation = this.validateConfig(connectionConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    try {
      const { apiEndpoint, credentials } = connectionConfig;
      
      // Build query parameters
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.limit) params.limit = filters.limit;
      
      const queryString = new URLSearchParams(params).toString();
      const url = `${apiEndpoint}/invoices${queryString ? '?' + queryString : ''}`;
      
      const headers = {
        'Authorization': `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`
      };
      
      const response = await this.makeRequestWithRetry('GET', url, null, headers);
      
      // Transform Tally invoice format to standardized format using field mapping
      const invoices = response.invoices || response.data || [];
      return invoices.map(invoice => this.transformTallyInvoice(invoice, fieldMapping));
      
    } catch (error) {
      console.error('Failed to import invoices from Tally:', error.message);
      throw error;
    }
  }
  
  /**
   * Transform Tally invoice format to standardized format using field mapping
   * 
   * @param {Object} tallyInvoice - Invoice in Tally format
   * @param {Object} fieldMapping - Field mapping configuration
   * @returns {Object} Invoice in standardized format
   */
  transformTallyInvoice(tallyInvoice, fieldMapping = null) {
    // Use provided field mapping or fall back to defaults
    const invoiceMapping = fieldMapping?.invoice || {
      invoiceNumber: 'VOUCHERNUMBER',
      invoiceDate: 'DATE',
      buyerName: 'PARTYNAME',
      buyerGSTIN: 'PARTYGSTIN',
      totalAmount: 'AMOUNT',
      subtotal: 'SUBTOTAL',
      totalTax: 'TOTALTAX'
    };
    
    const lineItemMapping = fieldMapping?.lineItem || {
      description: 'STOCKITEMNAME',
      quantity: 'ACTUALQTY',
      rate: 'RATE',
      taxableAmount: 'AMOUNT',
      taxAmount: 'CGSTAMOUNT'
    };
    
    // Helper function to get value from object using mapped field name
    const getValue = (obj, mappedField, fallback = null) => {
      return obj[mappedField] || obj[mappedField.toLowerCase()] || obj[mappedField.toUpperCase()] || fallback;
    };
    
    // Extract invoice-level fields using mapping
    const invoiceNumber = getValue(tallyInvoice, invoiceMapping.invoiceNumber);
    const invoiceDate = getValue(tallyInvoice, invoiceMapping.invoiceDate);
    const buyerName = getValue(tallyInvoice, invoiceMapping.buyerName);
    const buyerGSTIN = getValue(tallyInvoice, invoiceMapping.buyerGSTIN);
    const totalAmount = getValue(tallyInvoice, invoiceMapping.totalAmount, 0);
    
    // Extract line items (handle multiple possible array field names)
    const lineItemsArray = tallyInvoice.lineItems || tallyInvoice.items || tallyInvoice.ledgerEntries || 
                          tallyInvoice.ALLLEDGERENTRIES || tallyInvoice.INVENTORY || [];
    
    return {
      invoiceNumber: invoiceNumber,
      invoiceDate: new Date(invoiceDate),
      buyerCompanyName: buyerName,
      buyerGSTIN: buyerGSTIN,
      lineItems: lineItemsArray.map((item, index) => ({
        lineNumber: index + 1,
        description: getValue(item, lineItemMapping.description, 'N/A'),
        quantity: parseFloat(getValue(item, lineItemMapping.quantity, 1)),
        rate: parseFloat(getValue(item, lineItemMapping.rate, 0)),
        taxableAmount: parseFloat(getValue(item, lineItemMapping.taxableAmount, 0)),
        taxAmount: parseFloat(getValue(item, lineItemMapping.taxAmount, 0))
      })),
      taxableAmount: parseFloat(getValue(tallyInvoice, invoiceMapping.subtotal, 0)),
      taxAmount: parseFloat(getValue(tallyInvoice, invoiceMapping.totalTax, 0)),
      totalAmount: parseFloat(totalAmount),
      sourceReferenceId: `TALLY-${tallyInvoice.masterId || tallyInvoice.id || invoiceNumber}`,
      rawPayload: tallyInvoice
    };
  }
  
  /**
   * Push invoice to Tally (Requirement 9.1)
   * 
   * @param {Object} connectionConfig - Connection configuration
   * @param {Object} invoiceData - Invoice data in standardized format
   * @param {Object} fieldMapping - Field mapping configuration
   * @returns {Promise<Object>} Result with success, referenceId, and message
   */
  async pushInvoice(connectionConfig, invoiceData, fieldMapping = null) {
    // Validate configuration
    const validation = this.validateConfig(connectionConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    try {
      const { apiEndpoint, credentials } = connectionConfig;
      
      // Transform to Tally format using field mapping
      const tallyInvoice = this.transformToTallyFormat(invoiceData, fieldMapping);
      
      const url = `${apiEndpoint}/invoices`;
      const headers = {
        'Authorization': `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`
      };
      
      const response = await this.makeRequestWithRetry('POST', url, tallyInvoice, headers);
      
      return {
        success: true,
        referenceId: response.voucherId || response.id || response.invoiceId,
        message: 'Invoice pushed to Tally successfully'
      };
      
    } catch (error) {
      console.error('Failed to push invoice to Tally:', error.message);
      return {
        success: false,
        referenceId: null,
        message: error.message
      };
    }
  }
  
  /**
   * Transform standardized invoice format to Tally format using field mapping
   * 
   * @param {Object} invoiceData - Invoice in standardized format
   * @param {Object} fieldMapping - Field mapping configuration
   * @returns {Object} Invoice in Tally format
   */
  transformToTallyFormat(invoiceData, fieldMapping = null) {
    // Use provided field mapping or fall back to defaults
    const invoiceMapping = fieldMapping?.invoice || {
      invoiceNumber: 'VOUCHERNUMBER',
      invoiceDate: 'DATE',
      buyerName: 'PARTYNAME',
      buyerGSTIN: 'PARTYGSTIN',
      totalAmount: 'AMOUNT'
    };
    
    const lineItemMapping = fieldMapping?.lineItem || {
      description: 'STOCKITEMNAME',
      quantity: 'ACTUALQTY',
      rate: 'RATE',
      taxableAmount: 'AMOUNT',
      taxAmount: 'CGSTAMOUNT'
    };
    
    // Build Tally invoice object using mapped field names
    const tallyInvoice = {
      voucherType: 'Sales'
    };
    
    // Map invoice-level fields
    tallyInvoice[invoiceMapping.invoiceNumber] = invoiceData.invoiceNumber;
    tallyInvoice[invoiceMapping.invoiceDate] = invoiceData.invoiceDate;
    tallyInvoice[invoiceMapping.buyerName] = invoiceData.sellerCompanyName;
    tallyInvoice[invoiceMapping.buyerGSTIN] = invoiceData.sellerGSTIN;
    tallyInvoice[invoiceMapping.totalAmount] = invoiceData.totalAmount;
    
    // Map line items
    tallyInvoice.lineItems = invoiceData.lineItems.map(item => {
      const tallyItem = {};
      tallyItem[lineItemMapping.description] = item.description;
      tallyItem[lineItemMapping.quantity] = item.quantity;
      tallyItem[lineItemMapping.rate] = item.rate;
      tallyItem[lineItemMapping.taxableAmount] = item.taxableAmount;
      tallyItem[lineItemMapping.taxAmount] = item.taxAmount;
      return tallyItem;
    });
    
    return tallyInvoice;
  }
}

module.exports = TallyConnector;
