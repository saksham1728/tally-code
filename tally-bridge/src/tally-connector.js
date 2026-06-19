/**
 * Tally Connector Module
 * 
 * Connects to local Tally via XML/HTTP requests
 * Handles invoice fetch and push operations
 */

const axios = require('axios');
const xml2js = require('xml2js');

class TallyConnector {
  constructor(endpoint, logger) {
    this.endpoint = endpoint || 'http://localhost:9000';
    this.logger = logger;
    this.timeout = 10000; // 10 seconds
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 4000]; // Exponential backoff
    
    // Circuit breaker
    this.circuitState = 'closed'; // closed, open, half-open
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitOpenDuration = 60000; // 60 seconds
    this.maxFailures = 5;
  }
  
  /**
   * Check circuit breaker state
   * @returns {boolean}
   */
  isCircuitOpen() {
    if (this.circuitState === 'closed') {
      return false;
    }
    
    if (this.circuitState === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.circuitOpenDuration) {
        this.circuitState = 'half-open';
        return false;
      }
      return true;
    }
    
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
      this.logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
  
  /**
   * Make HTTP request with retry logic
   * @param {string} xmlData 
   * @returns {Promise<string>}
   */
  async makeRequest(xmlData) {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error('Tally connection unavailable (circuit breaker open)');
    }
    
    let lastError = null;
    
    // Retry loop
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await axios.post(this.endpoint, xmlData, {
          headers: {
            'Content-Type': 'application/xml'
          },
          timeout: this.timeout
        });
        
        this.recordSuccess();
        return response.data;
        
      } catch (error) {
        lastError = error;
        
        this.logger.warn(`Tally request failed (attempt ${attempt + 1}/${this.maxRetries})`, {
          error: error.message
        });
        
        // Wait before retrying
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelays[attempt];
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    this.recordFailure();
    throw lastError;
  }
  
  /**
   * Build XML request for fetching vouchers/invoices
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {string}
   */
  buildFetchInvoicesXML(startDate, endDate) {
    const startDateStr = this.formatDate(startDate);
    const endDateStr = this.formatDate(endDate);
    
    return `
      <ENVELOPE>
        <HEADER>
          <VERSION>1</VERSION>
          <TALLYREQUEST>Export</TALLYREQUEST>
          <TYPE>Data</TYPE>
          <ID>VoucherList</ID>
        </HEADER>
        <BODY>
          <DESC>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              <SVFROMDATE>${startDateStr}</SVFROMDATE>
              <SVTODATE>${endDateStr}</SVTODATE>
            </STATICVARIABLES>
          </DESC>
        </BODY>
      </ENVELOPE>
    `;
  }
  
  /**
   * Build XML request for pushing invoice
   * @param {Object} invoiceData 
   * @returns {string}
   */
  buildPushInvoiceXML(invoiceData) {
    const lineItems = invoiceData.lineItems.map(item => `
      <ALLLEDGERENTRIES.LIST>
        <STOCKITEMNAME>${this.escapeXML(item.description)}</STOCKITEMNAME>
        <ACTUALQTY>${item.quantity}</ACTUALQTY>
        <RATE>${item.rate}</RATE>
        <AMOUNT>${item.taxableAmount}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
    `).join('');
    
    return `
      <ENVELOPE>
        <HEADER>
          <VERSION>1</VERSION>
          <TALLYREQUEST>Import</TALLYREQUEST>
          <TYPE>Data</TYPE>
          <ID>Vouchers</ID>
        </HEADER>
        <BODY>
          <DESC>
            <VOUCHER>
              <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
              <VOUCHERNUMBER>${this.escapeXML(invoiceData.invoiceNumber)}</VOUCHERNUMBER>
              <DATE>${this.formatDate(new Date(invoiceData.invoiceDate))}</DATE>
              <PARTYNAME>${this.escapeXML(invoiceData.buyerCompanyName)}</PARTYNAME>
              <PARTYGSTIN>${this.escapeXML(invoiceData.buyerGSTIN || '')}</PARTYGSTIN>
              ${lineItems}
            </VOUCHER>
          </DESC>
        </BODY>
      </ENVELOPE>
    `;
  }
  
  /**
   * Test connection to Tally
   * @returns {Promise<Object>}
   */
  async testConnection() {
    try {
      this.logger.info('Testing Tally connection', { endpoint: this.endpoint });
      
      // Simple XML request to check if Tally is responding
      const xml = `
        <ENVELOPE>
          <HEADER>
            <VERSION>1</VERSION>
            <TALLYREQUEST>Export</TALLYREQUEST>
            <TYPE>Data</TYPE>
            <ID>CompanyInfo</ID>
          </HEADER>
        </ENVELOPE>
      `;
      
      await this.makeRequest(xml);
      
      this.logger.info('Tally connection successful');
      
      return { 
        success: true, 
        message: 'Connected to Tally successfully' 
      };
      
    } catch (error) {
      this.logger.error('Tally connection failed', { error: error.message });
      
      let message = 'Failed to connect to Tally';
      
      if (error.code === 'ECONNREFUSED') {
        message = 'Tally is not running or ODBC server is disabled';
      } else if (error.code === 'ETIMEDOUT') {
        message = 'Connection to Tally timed out';
      } else {
        message = error.message;
      }
      
      return { 
        success: false, 
        message 
      };
    }
  }
  
  /**
   * Fetch invoices from Tally
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Promise<Array>}
   */
  async fetchInvoices(startDate, endDate) {
    try {
      this.logger.info('Fetching invoices from Tally', { startDate, endDate });
      
      const xml = this.buildFetchInvoicesXML(startDate, endDate);
      const response = await this.makeRequest(xml);
      
      // Parse XML response
      const invoices = await this.parseInvoicesXML(response);
      
      this.logger.info('Fetched invoices from Tally', { count: invoices.length });
      
      return invoices;
      
    } catch (error) {
      this.logger.error('Failed to fetch invoices', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Push invoice to Tally
   * @param {Object} invoiceData 
   * @returns {Promise<Object>}
   */
  async pushInvoice(invoiceData) {
    try {
      this.logger.info('Pushing invoice to Tally', { 
        invoiceNumber: invoiceData.invoiceNumber 
      });
      
      const xml = this.buildPushInvoiceXML(invoiceData);
      await this.makeRequest(xml);
      
      this.logger.info('Invoice pushed to Tally successfully', {
        invoiceNumber: invoiceData.invoiceNumber
      });
      
      return { 
        success: true, 
        message: 'Invoice pushed to Tally successfully' 
      };
      
    } catch (error) {
      this.logger.error('Failed to push invoice to Tally', { 
        error: error.message,
        invoiceNumber: invoiceData.invoiceNumber
      });
      
      return { 
        success: false, 
        message: error.message 
      };
    }
  }
  
  /**
   * Parse XML response to extract invoices
   * @param {string} xmlData 
   * @returns {Promise<Array>}
   */
  async parseInvoicesXML(xmlData) {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlData);
    
    // Extract vouchers/invoices from parsed XML
    const vouchers = result?.ENVELOPE?.BODY?.[0]?.DATA?.[0]?.COLLECTION?.[0]?.VOUCHER || [];
    
    return vouchers.map(voucher => {
      const totalAmount = parseFloat(voucher.AMOUNT?.[0] || 0);
      const taxableAmount = parseFloat(voucher.SUBTOTAL?.[0] || 0);
      const taxAmount = parseFloat(voucher.TOTALTAX?.[0] || 0);
      const invoiceNumber = voucher.VOUCHERNUMBER?.[0] || '';
      
      return {
        invoiceNumber,
        invoiceDate: voucher.DATE?.[0] || new Date().toISOString().split('T')[0],
        buyerCompanyName: voucher.PARTYNAME?.[0] || '',
        buyerGSTIN: voucher.PARTYGSTIN?.[0] || '',
        totalAmount,
        taxableAmount,
        taxAmount,
        sourceReferenceId: `TALLY-${invoiceNumber}-${Date.now()}`, // Unique reference
        rawPayload: JSON.stringify(voucher),
        lineItems: (voucher['ALLLEDGERENTRIES.LIST'] || voucher.ALLLEDGERENTRIES?.LIST || []).map((item, index) => ({
          lineNumber: index + 1,
          description: item.STOCKITEMNAME?.[0] || '',
          quantity: parseFloat(item.ACTUALQTY?.[0] || 1),
          rate: parseFloat(item.RATE?.[0] || 0),
          taxableAmount: parseFloat(item.AMOUNT?.[0] || 0),
          taxAmount: parseFloat(item.CGSTAMOUNT?.[0] || 0) * 2 // CGST + SGST (assuming equal)
        }))
      };
    });
  }
  
  /**
   * Format date for Tally (YYYYMMDD)
   * @param {Date} date 
   * @returns {string}
   */
  formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}`;
  }
  
  /**
   * Escape XML special characters
   * @param {string} str 
   * @returns {string}
   */
  escapeXML(str) {
    if (!str) return '';
    
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = TallyConnector;
