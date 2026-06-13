/**
 * Invoice Model
 * 
 * Represents an invoice that flows from seller to buyer through the platform.
 * Includes buyer matching, status tracking, and duplicate prevention.
 * 
 * Requirements: 4.2, 4.5, 19.3
 */

const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    validate: {
      validator: function(v) {
        // Invoice date should not be in the future (Requirement 14.4)
        return v <= new Date();
      },
      message: 'Invoice date cannot be in the future'
    }
  },
  sellerCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Seller company ID is required']
  },
  buyerCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
    // null if buyer not matched yet
  },
  buyerCompanyName: {
    type: String,
    required: [true, 'Buyer company name is required'],
    trim: true
  },
  buyerGSTIN: {
    type: String,
    uppercase: true,
    trim: true
  },
  taxableAmount: {
    type: Number,
    required: [true, 'Taxable amount is required'],
    min: [0, 'Taxable amount cannot be negative']
  },
  taxAmount: {
    type: Number,
    required: [true, 'Tax amount is required'],
    min: [0, 'Tax amount cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: {
      values: ['New', 'Accepted', 'Rejected', 'Pushed_to_Tally', 'Failed', 'Unmatched'],
      message: '{VALUE} is not a valid status'
    },
    default: 'New' // Requirement 11.1: Initial status is "New"
  },
  sourceReferenceId: {
    type: String,
    required: [true, 'Source reference ID is required'],
    unique: true // Requirement 4.5: Prevents duplicate imports
  },
  rawPayload: {
    type: mongoose.Schema.Types.Mixed
    // Original Tally response for debugging
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  statusChangedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes (Requirement 19.3)
invoiceSchema.index({ sellerCompanyId: 1, invoiceDate: -1 }); // For seller dashboard queries
invoiceSchema.index({ buyerCompanyId: 1, invoiceDate: -1 }); // For buyer dashboard queries
invoiceSchema.index({ sourceReferenceId: 1 }, { unique: true }); // For duplicate prevention
invoiceSchema.index({ status: 1 }); // For status-based queries

/**
 * Pre-save hook to update statusChangedAt when status changes
 * Requirements 11.5, 11.6: Record timestamp for each status change
 */
invoiceSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusChangedAt = new Date();
  }
  next();
});

/**
 * Instance method to update invoice status
 * 
 * @param {string} newStatus - New status value
 * @returns {Promise<Invoice>} Updated invoice
 */
invoiceSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  this.statusChangedAt = new Date();
  return await this.save();
};

/**
 * Instance method to match with buyer company
 * 
 * @param {string} buyerCompanyId - Buyer company ObjectId
 * @returns {Promise<Invoice>} Updated invoice
 */
invoiceSchema.methods.matchBuyer = async function(buyerCompanyId) {
  this.buyerCompanyId = buyerCompanyId;
  return await this.save();
};

/**
 * Static method to find invoices by seller
 * 
 * @param {string} sellerCompanyId - Seller company ID
 * @param {Object} options - Query options (limit, skip, status filter)
 * @returns {Promise<Array<Invoice>>} Array of invoices
 */
invoiceSchema.statics.findBySeller = function(sellerCompanyId, options = {}) {
  const query = { sellerCompanyId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ invoiceDate: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0)
    .populate('buyerCompanyId', 'name gstin email');
};

/**
 * Static method to find invoices by buyer
 * 
 * @param {string} buyerCompanyId - Buyer company ID
 * @param {Object} options - Query options (limit, skip, status filter)
 * @returns {Promise<Array<Invoice>>} Array of invoices
 */
invoiceSchema.statics.findByBuyer = function(buyerCompanyId, options = {}) {
  const query = { buyerCompanyId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ invoiceDate: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0)
    .populate('sellerCompanyId', 'name gstin email');
};

/**
 * Static method to check if invoice already imported
 * 
 * @param {string} sourceReferenceId - Source reference ID from Tally
 * @returns {Promise<boolean>} True if invoice exists, false otherwise
 */
invoiceSchema.statics.isAlreadyImported = async function(sourceReferenceId) {
  const count = await this.countDocuments({ sourceReferenceId });
  return count > 0;
};

/**
 * Static method to find unmatched invoices
 * 
 * @param {Object} options - Query options (limit, skip)
 * @returns {Promise<Array<Invoice>>} Array of unmatched invoices
 */
invoiceSchema.statics.findUnmatched = function(options = {}) {
  return this.find({ 
    status: 'Unmatched',
    buyerCompanyId: null 
  })
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0)
    .populate('sellerCompanyId', 'name gstin email');
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
