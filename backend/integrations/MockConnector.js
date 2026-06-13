/**
 * MockConnector Implementation
 * 
 * Mock implementation of IIntegrationConnector for development and testing.
 * Returns hardcoded sample data without making actual API calls.
 * 
 * Requirements: 16.2
 */

const IIntegrationConnector = require('./IIntegrationConnector');

class MockConnector extends IIntegrationConnector {
  constructor() {
    super();
    this.name = 'Mock';
  }
  
  /**
   * Get connector name
   */
  getName() {
    return this.name;
  }
  
  /**
   * Test connectivity (mock - always succeeds)
   * 
   * @param {Object} connectionConfig - Connection configuration
   * @returns {Promise<Object>} Success result
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
    
    // Simulate network delay
    await this.simulateDelay(500);
    
    return {
      success: true,
      message: 'Mock connection successful'
    };
  }
  
  /**
   * Import invoices (mock - returns sample data)
   * 
   * @param {Object} connectionConfig - Connection configuration
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Array of sample invoice objects
   */
  async importInvoices(connectionConfig, filters = {}) {
    // Validate configuration
    const validation = this.validateConfig(connectionConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    // Simulate network delay
    await this.simulateDelay(1000);
    
    // Return sample invoices
    const sampleInvoices = this.generateSampleInvoices(filters.limit || 5);
    
    // Apply date filters if provided
    let filteredInvoices = sampleInvoices;
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredInvoices = filteredInvoices.filter(inv => new Date(inv.invoiceDate) >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredInvoices = filteredInvoices.filter(inv => new Date(inv.invoiceDate) <= endDate);
    }
    
    return filteredInvoices;
  }
  
  /**
   * Push invoice (mock - simulates success)
   * 
   * @param {Object} connectionConfig - Connection configuration
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<Object>} Success result with mock reference ID
   */
  async pushInvoice(connectionConfig, invoiceData) {
    // Validate configuration
    const validation = this.validateConfig(connectionConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    // Simulate network delay
    await this.simulateDelay(800);
    
    // Simulate 10% failure rate for testing
    if (Math.random() < 0.1) {
      return {
        success: false,
        referenceId: null,
        message: 'Mock error: Simulated push failure for testing'
      };
    }
    
    // Generate mock reference ID
    const referenceId = `MOCK-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    return {
      success: true,
      referenceId,
      message: 'Invoice pushed to mock Tally successfully'
    };
  }
  
  /**
   * Generate sample invoices for testing
   * 
   * @param {number} count - Number of invoices to generate
   * @returns {Array} Array of sample invoice objects
   */
  generateSampleInvoices(count = 5) {
    const invoices = [];
    const today = new Date();
    
    const buyerCompanies = [
      { name: 'Tech Solutions Pvt Ltd', gstin: '29ABCDE1234F1Z5' },
      { name: 'Global Traders Inc', gstin: '27XYZAB5678G2W3' },
      { name: 'Prime Distributors', gstin: '24PQRST9012H3V7' },
      { name: 'Metro Wholesale Corp', gstin: '19LMNOP3456J4K9' },
      { name: 'Eastern Enterprises', gstin: '36FGHIJ7890K5L2' }
    ];
    
    const products = [
      { desc: 'Laptop Computer', rate: 45000, qty: 2 },
      { desc: 'Office Desk', rate: 8500, qty: 5 },
      { desc: 'Ergonomic Chair', rate: 12000, qty: 3 },
      { desc: 'Monitor 24 inch', rate: 15000, qty: 4 },
      { desc: 'Printer Multifunction', rate: 18000, qty: 1 },
      { desc: 'Software License', rate: 25000, qty: 10 },
      { desc: 'Network Switch', rate: 32000, qty: 2 },
      { desc: 'UPS 2KVA', rate: 9500, qty: 3 }
    ];
    
    for (let i = 0; i < count; i++) {
      const buyer = buyerCompanies[i % buyerCompanies.length];
      const invoiceDate = new Date(today);
      invoiceDate.setDate(today.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
      
      // Generate 2-4 line items per invoice
      const lineItemCount = 2 + Math.floor(Math.random() * 3);
      const lineItems = [];
      let taxableTotal = 0;
      let taxTotal = 0;
      
      for (let j = 0; j < lineItemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = product.qty;
        const rate = product.rate;
        const taxableAmount = quantity * rate;
        const taxAmount = taxableAmount * 0.18; // 18% GST
        
        lineItems.push({
          lineNumber: j + 1,
          description: product.desc,
          quantity,
          rate,
          taxableAmount,
          taxAmount
        });
        
        taxableTotal += taxableAmount;
        taxTotal += taxAmount;
      }
      
      invoices.push({
        invoiceNumber: `INV-2024-${String(1000 + i).padStart(4, '0')}`,
        invoiceDate,
        buyerCompanyName: buyer.name,
        buyerGSTIN: buyer.gstin,
        lineItems,
        taxableAmount: Math.round(taxableTotal * 100) / 100,
        taxAmount: Math.round(taxTotal * 100) / 100,
        totalAmount: Math.round((taxableTotal + taxTotal) * 100) / 100,
        sourceReferenceId: `MOCK-${Date.now()}-${i}`,
        rawPayload: {
          mockData: true,
          generatedAt: new Date().toISOString()
        }
      });
    }
    
    return invoices;
  }
  
  /**
   * Simulate network delay
   * 
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise<void>}
   */
  async simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MockConnector;
