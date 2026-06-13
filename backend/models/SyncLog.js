/**
 * SyncLog Model
 * 
 * Records all synchronization events for audit trail and troubleshooting.
 * Tracks invoice imports, buyer matching, and push operations.
 * 
 * Requirements: 10.3, 19.5
 */

const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  eventType: {
    type: String,
    enum: {
      values: [
        'import_from_tally',
        'buyer_match_attempt',
        'buyer_match_success',
        'buyer_match_failed',
        'invoice_shared_to_buyer',
        'push_to_tally_attempt',
        'push_to_tally_success',
        'push_to_tally_failed'
      ],
      message: '{VALUE} is not a valid event type'
    },
    required: [true, 'Event type is required']
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  status: {
    type: String
  },
  errorMessage: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed // Additional event-specific data
  }
});

// Indexes (Requirement 19.5)
syncLogSchema.index({ timestamp: -1 }); // Descending for reverse chronological order
syncLogSchema.index({ invoiceId: 1 });
syncLogSchema.index({ companyId: 1 });
syncLogSchema.index({ eventType: 1 });
syncLogSchema.index({ timestamp: -1, companyId: 1 }); // Compound index for company-specific logs

/**
 * Static method to create a new sync log entry
 * 
 * @param {Object} logData - Log data
 * @param {string} logData.eventType - Type of event
 * @param {string} logData.invoiceId - Invoice ID (optional)
 * @param {string} logData.companyId - Company ID (optional)
 * @param {string} logData.status - Status (optional)
 * @param {string} logData.errorMessage - Error message (optional)
 * @param {Object} logData.metadata - Additional metadata (optional)
 * @returns {Promise<SyncLog>} Created sync log entry
 */
syncLogSchema.statics.createLog = async function(logData) {
  const log = new this({
    timestamp: new Date(),
    ...logData
  });
  
  return await log.save();
};

/**
 * Static method to get logs with filtering
 * 
 * @param {Object} filters - Filter criteria
 * @param {string} filters.invoiceId - Filter by invoice ID
 * @param {string} filters.companyId - Filter by company ID
 * @param {string} filters.eventType - Filter by event type
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.limit - Maximum number of logs to return (default: 100)
 * @returns {Promise<Array<SyncLog>>} Array of sync logs
 */
syncLogSchema.statics.findWithFilters = async function(filters = {}) {
  const query = {};
  
  if (filters.invoiceId) {
    query.invoiceId = filters.invoiceId;
  }
  
  if (filters.companyId) {
    query.companyId = filters.companyId;
  }
  
  if (filters.eventType) {
    query.eventType = filters.eventType;
  }
  
  // Date range filter
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    
    if (filters.startDate) {
      query.timestamp.$gte = new Date(filters.startDate);
    }
    
    if (filters.endDate) {
      query.timestamp.$lte = new Date(filters.endDate);
    }
  }
  
  const limit = filters.limit || 100;
  
  return await this.find(query)
    .sort({ timestamp: -1 }) // Reverse chronological order
    .limit(limit)
    .populate('invoiceId', 'invoiceNumber invoiceDate')
    .populate('companyId', 'name gstin');
};

/**
 * Static method to get logs for a specific invoice
 * 
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Array<SyncLog>>} Array of sync logs for the invoice
 */
syncLogSchema.statics.findByInvoice = function(invoiceId) {
  return this.find({ invoiceId })
    .sort({ timestamp: -1 })
    .populate('companyId', 'name gstin');
};

/**
 * Static method to get logs for a specific company
 * 
 * @param {string} companyId - Company ID
 * @param {number} limit - Maximum number of logs (default: 100)
 * @returns {Promise<Array<SyncLog>>} Array of sync logs for the company
 */
syncLogSchema.statics.findByCompany = function(companyId, limit = 100) {
  return this.find({ companyId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('invoiceId', 'invoiceNumber invoiceDate');
};

const SyncLog = mongoose.model('SyncLog', syncLogSchema);

module.exports = SyncLog;
