/**
 * TallyConnection Model
 * 
 * Stores Tally API connection configuration for each company.
 * Credentials are stored in encrypted format.
 * 
 * Requirements: 3.1, 19.6
 */

const mongoose = require('mongoose');

const tallyConnectionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company ID is required'],
    unique: true // One Tally connection per company
  },
  apiEndpoint: {
    type: String,
    required: [true, 'API endpoint is required'],
    trim: true
  },
  encryptedCredentials: {
    type: String,
    required: [true, 'Credentials are required']
    // Stored as AES-encrypted JSON string
    // Never store credentials in plain text (Requirements 3.2, 17.1, 17.3)
  },
  connectionStatus: {
    type: String,
    enum: {
      values: ['connected', 'disconnected', 'error'],
      message: '{VALUE} is not a valid connection status'
    },
    default: 'disconnected'
  },
  lastTestedAt: {
    type: Date
  },
  lastError: {
    type: String
  },
  // Field Mapping Configuration
  // Maps Tally field names to our standard schema
  fieldMapping: {
    // Invoice-level field mappings
    invoice: {
      invoiceNumber: { type: String, default: 'VOUCHERNUMBER' },
      invoiceDate: { type: String, default: 'DATE' },
      buyerName: { type: String, default: 'PARTYNAME' },
      buyerGSTIN: { type: String, default: 'PARTYGSTIN' },
      totalAmount: { type: String, default: 'AMOUNT' },
      subtotal: { type: String, default: 'SUBTOTAL' },
      totalTax: { type: String, default: 'TOTALTAX' }
    },
    // Line item field mappings
    lineItem: {
      description: { type: String, default: 'STOCKITEMNAME' },
      quantity: { type: String, default: 'ACTUALQTY' },
      rate: { type: String, default: 'RATE' },
      taxableAmount: { type: String, default: 'AMOUNT' },
      taxAmount: { type: String, default: 'CGSTAMOUNT' }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes (Requirement 19.6)
tallyConnectionSchema.index({ companyId: 1 }, { unique: true });

/**
 * Instance method to update connection status
 * 
 * @param {string} status - New connection status (connected, disconnected, error)
 * @param {string} errorMessage - Optional error message if status is 'error'
 */
tallyConnectionSchema.methods.updateStatus = async function(status, errorMessage = null) {
  this.connectionStatus = status;
  this.lastTestedAt = new Date();
  
  if (status === 'error' && errorMessage) {
    this.lastError = errorMessage;
  } else if (status === 'connected') {
    this.lastError = null; // Clear error on successful connection
  }
  
  await this.save();
};

/**
 * Static method to find connection by company ID
 * 
 * @param {string} companyId - Company ID to search for
 * @returns {Promise<TallyConnection|null>} Connection if found, null otherwise
 */
tallyConnectionSchema.statics.findByCompany = function(companyId) {
  return this.findOne({ companyId });
};

const TallyConnection = mongoose.model('TallyConnection', tallyConnectionSchema);

module.exports = TallyConnection;
