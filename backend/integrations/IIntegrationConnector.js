/**
 * Integration Connector Interface
 * 
 * Defines the standard interface that all accounting software connectors must implement.
 * This allows the system to support multiple accounting software beyond Tally in the future.
 * 
 * Requirements: 16.1, 16.3
 */

/**
 * Base class for all integration connectors
 * All accounting software connectors (Tally, QuickBooks, etc.) must extend this class
 */
class IIntegrationConnector {
  /**
   * Test connectivity to accounting software
   * 
   * @param {Object} connectionConfig - Connection configuration object
   * @param {string} connectionConfig.apiEndpoint - API endpoint URL
   * @param {Object} connectionConfig.credentials - Decrypted credentials object
   * @param {string} connectionConfig.credentials.username - Username
   * @param {string} connectionConfig.credentials.password - Password
   * @returns {Promise<Object>} Result object with success flag and message
   * 
   * @example
   * const result = await connector.testConnection(config);
   * // { success: true, message: 'Connection successful' }
   * // { success: false, message: 'Connection failed: timeout' }
   */
  async testConnection(connectionConfig) {
    throw new Error('testConnection method must be implemented by subclass');
  }

  /**
   * Import invoices from accounting software
   * 
   * @param {Object} connectionConfig - Connection configuration object
   * @param {string} connectionConfig.apiEndpoint - API endpoint URL
   * @param {Object} connectionConfig.credentials - Decrypted credentials object
   * @param {Object} filters - Filter criteria for invoices
   * @param {Date} filters.startDate - Start date for invoice filter (optional)
   * @param {Date} filters.endDate - End date for invoice filter (optional)
   * @param {number} filters.limit - Maximum number of invoices to import (optional)
   * @returns {Promise<Array<Object>>} Array of invoice objects in standardized format
   * 
   * Invoice object format:
   * {
   *   invoiceNumber: string,
   *   invoiceDate: Date,
   *   buyerCompanyName: string,
   *   buyerGSTIN: string,
   *   lineItems: Array<{
   *     lineNumber: number,
   *     description: string,
   *     quantity: number,
   *     rate: number,
   *     taxableAmount: number,
   *     taxAmount: number
   *   }>,
   *   taxableAmount: number,
   *   taxAmount: number,
   *   totalAmount: number,
   *   sourceReferenceId: string,
   *   rawPayload: Object
   * }
   * 
   * @example
   * const invoices = await connector.importInvoices(config, {
   *   startDate: new Date('2024-01-01'),
   *   endDate: new Date('2024-01-31')
   * });
   */
  async importInvoices(connectionConfig, filters = {}) {
    throw new Error('importInvoices method must be implemented by subclass');
  }

  /**
   * Push invoice to accounting software
   * 
   * @param {Object} connectionConfig - Connection configuration object
   * @param {string} connectionConfig.apiEndpoint - API endpoint URL
   * @param {Object} connectionConfig.credentials - Decrypted credentials object
   * @param {Object} invoiceData - Invoice data to push (in standardized format)
   * @param {string} invoiceData.invoiceNumber - Invoice number
   * @param {Date} invoiceData.invoiceDate - Invoice date
   * @param {string} invoiceData.sellerCompanyName - Seller company name
   * @param {string} invoiceData.sellerGSTIN - Seller GSTIN
   * @param {Array} invoiceData.lineItems - Line items array
   * @param {number} invoiceData.taxableAmount - Total taxable amount
   * @param {number} invoiceData.taxAmount - Total tax amount
   * @param {number} invoiceData.totalAmount - Grand total amount
   * @returns {Promise<Object>} Result object with success flag, reference ID, and message
   * 
   * @example
   * const result = await connector.pushInvoice(config, invoiceData);
   * // { success: true, referenceId: 'TALLY-12345', message: 'Invoice pushed successfully' }
   * // { success: false, referenceId: null, message: 'Push failed: duplicate invoice' }
   */
  async pushInvoice(connectionConfig, invoiceData) {
    throw new Error('pushInvoice method must be implemented by subclass');
  }
  
  /**
   * Get connector name/type
   * 
   * @returns {string} Connector name (e.g., 'Tally', 'QuickBooks')
   */
  getName() {
    throw new Error('getName method must be implemented by subclass');
  }
  
  /**
   * Validate connection configuration
   * 
   * @param {Object} connectionConfig - Connection configuration to validate
   * @returns {Object} Validation result with isValid flag and errors array
   * 
   * @example
   * const validation = connector.validateConfig(config);
   * // { isValid: true, errors: [] }
   * // { isValid: false, errors: ['Missing apiEndpoint', 'Invalid credentials format'] }
   */
  validateConfig(connectionConfig) {
    const errors = [];
    
    if (!connectionConfig) {
      errors.push('Connection configuration is required');
      return { isValid: false, errors };
    }
    
    if (!connectionConfig.apiEndpoint) {
      errors.push('API endpoint is required');
    }
    
    if (!connectionConfig.credentials) {
      errors.push('Credentials are required');
    } else {
      if (!connectionConfig.credentials.username) {
        errors.push('Username is required in credentials');
      }
      if (!connectionConfig.credentials.password) {
        errors.push('Password is required in credentials');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = IIntegrationConnector;
