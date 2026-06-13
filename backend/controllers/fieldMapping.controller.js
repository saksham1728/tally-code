/**
 * Field Mapping Controller
 * 
 * Handles user-configurable field mappings between Tally and our standard schema.
 * Allows users to customize how Tally fields map to our internal invoice structure.
 */

const TallyConnection = require('../models/TallyConnection');
const { decryptCredentials } = require('../config/encryption');
const axios = require('axios');

/**
 * Get current field mapping configuration
 * 
 * @route   GET /api/field-mapping
 * @access  Private
 */
const getFieldMapping = async (req, res) => {
  const { companyId } = req.user;
  
  // Find Tally connection for this company
  const tallyConnection = await TallyConnection.findOne({ companyId });
  
  if (!tallyConnection) {
    const error = new Error('Tally connection not configured. Please set up Tally connection first.');
    error.code = 'NO_TALLY_CONFIG';
    error.statusCode = 404;
    throw error;
  }
  
  res.json({
    success: true,
    data: {
      fieldMapping: tallyConnection.fieldMapping || {
        invoice: {
          invoiceNumber: 'VOUCHERNUMBER',
          invoiceDate: 'DATE',
          buyerName: 'PARTYNAME',
          buyerGSTIN: 'PARTYGSTIN',
          totalAmount: 'AMOUNT',
          subtotal: 'SUBTOTAL',
          totalTax: 'TOTALTAX'
        },
        lineItem: {
          description: 'STOCKITEMNAME',
          quantity: 'ACTUALQTY',
          rate: 'RATE',
          taxableAmount: 'AMOUNT',
          taxAmount: 'CGSTAMOUNT'
        }
      }
    }
  });
};

/**
 * Update field mapping configuration
 * 
 * @route   PUT /api/field-mapping
 * @access  Private
 */
const updateFieldMapping = async (req, res) => {
  const { companyId } = req.user;
  const { invoice, lineItem } = req.body;
  
  // Validate request body
  if (!invoice && !lineItem) {
    const error = new Error('At least one mapping (invoice or lineItem) must be provided');
    error.code = 'MISSING_REQUIRED_FIELDS';
    error.statusCode = 400;
    throw error;
  }
  
  // Find Tally connection
  const tallyConnection = await TallyConnection.findOne({ companyId });
  
  if (!tallyConnection) {
    const error = new Error('Tally connection not configured. Please set up Tally connection first.');
    error.code = 'NO_TALLY_CONFIG';
    error.statusCode = 404;
    throw error;
  }
  
  // Update field mapping
  if (invoice) {
    tallyConnection.fieldMapping.invoice = {
      ...tallyConnection.fieldMapping.invoice,
      ...invoice
    };
  }
  
  if (lineItem) {
    tallyConnection.fieldMapping.lineItem = {
      ...tallyConnection.fieldMapping.lineItem,
      ...lineItem
    };
  }
  
  await tallyConnection.save();
  
  res.json({
    success: true,
    message: 'Field mapping updated successfully',
    data: {
      fieldMapping: tallyConnection.fieldMapping
    }
  });
};

/**
 * Get available Tally fields (fetches sample data from Tally to show available fields)
 * 
 * @route   GET /api/field-mapping/available-fields
 * @access  Private
 */
const getAvailableTallyFields = async (req, res) => {
  const { companyId } = req.user;
  
  // Find Tally connection
  const tallyConnection = await TallyConnection.findOne({ companyId });
  
  if (!tallyConnection) {
    const error = new Error('Tally connection not configured');
    error.code = 'NO_TALLY_CONFIG';
    error.statusCode = 404;
    throw error;
  }
  
  // Decrypt credentials
  const credentials = decryptCredentials(tallyConnection.encryptedCredentials);
  
  try {
    // Fetch a sample invoice from Tally to extract available fields
    // This is a simplified version - actual implementation depends on Tally XML/JSON API
    const response = await axios.get(`${tallyConnection.apiEndpoint}/api/invoices`, {
      params: { limit: 1 }, // Get just one invoice
      timeout: 10000,
      auth: credentials.username ? {
        username: credentials.username,
        password: credentials.password
      } : undefined
    });
    
    // Extract field names from sample invoice
    const sampleInvoice = response.data.invoices?.[0] || {};
    const sampleLineItem = sampleInvoice.lineItems?.[0] || {};
    
    const availableFields = {
      invoice: Object.keys(sampleInvoice).filter(key => key !== 'lineItems'),
      lineItem: Object.keys(sampleLineItem)
    };
    
    res.json({
      success: true,
      data: {
        availableFields,
        sampleInvoice: {
          invoice: sampleInvoice,
          lineItem: sampleLineItem
        }
      }
    });
    
  } catch (error) {
    // If Tally is not reachable, return common field names
    res.json({
      success: true,
      data: {
        availableFields: {
          invoice: [
            'VOUCHERNUMBER', 'DATE', 'PARTYNAME', 'PARTYGSTIN', 
            'AMOUNT', 'SUBTOTAL', 'TOTALTAX', 'INVOICENO', 
            'INVOICEDATE', 'CUSTOMERNAME', 'CUSTOMERGSTIN'
          ],
          lineItem: [
            'STOCKITEMNAME', 'ACTUALQTY', 'RATE', 'AMOUNT', 
            'CGSTAMOUNT', 'SGSTAMOUNT', 'IGSTAMOUNT',
            'ITEMNAME', 'QUANTITY', 'UNITPRICE', 'TAXAMOUNT'
          ]
        },
        note: 'Could not fetch sample data from Tally. Showing common field names.'
      }
    });
  }
};

/**
 * Reset field mapping to defaults
 * 
 * @route   POST /api/field-mapping/reset
 * @access  Private
 */
const resetFieldMapping = async (req, res) => {
  const { companyId } = req.user;
  
  // Find Tally connection
  const tallyConnection = await TallyConnection.findOne({ companyId });
  
  if (!tallyConnection) {
    const error = new Error('Tally connection not configured');
    error.code = 'NO_TALLY_CONFIG';
    error.statusCode = 404;
    throw error;
  }
  
  // Reset to default mapping
  tallyConnection.fieldMapping = {
    invoice: {
      invoiceNumber: 'VOUCHERNUMBER',
      invoiceDate: 'DATE',
      buyerName: 'PARTYNAME',
      buyerGSTIN: 'PARTYGSTIN',
      totalAmount: 'AMOUNT',
      subtotal: 'SUBTOTAL',
      totalTax: 'TOTALTAX'
    },
    lineItem: {
      description: 'STOCKITEMNAME',
      quantity: 'ACTUALQTY',
      rate: 'RATE',
      taxableAmount: 'AMOUNT',
      taxAmount: 'CGSTAMOUNT'
    }
  };
  
  await tallyConnection.save();
  
  res.json({
    success: true,
    message: 'Field mapping reset to defaults',
    data: {
      fieldMapping: tallyConnection.fieldMapping
    }
  });
};

module.exports = {
  getFieldMapping,
  updateFieldMapping,
  getAvailableTallyFields,
  resetFieldMapping
};
