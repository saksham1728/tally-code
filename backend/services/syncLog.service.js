/**
 * Sync Log Service
 * 
 * Provides functions for creating and querying sync logs for audit trail.
 * 
 * Requirements: 5.6, 10.1, 10.2, 10.5
 */

const SyncLog = require('../models/SyncLog');

/**
 * Create a new sync log entry
 * 
 * Requirements 10.1, 10.2: Log all synchronization events with timestamp, event type, etc.
 * 
 * @param {Object} logData - Log entry data
 * @param {string} logData.eventType - Type of event
 * @param {string} logData.invoiceId - Invoice ID (optional)
 * @param {string} logData.companyId - Company ID (optional)
 * @param {string} logData.status - Status (optional)
 * @param {string} logData.errorMessage - Error message (optional)
 * @param {Object} logData.metadata - Additional metadata (optional)
 * @returns {Promise<SyncLog>} Created sync log entry
 */
async function createLog(logData) {
  try {
    return await SyncLog.createLog(logData);
  } catch (error) {
    console.error('Error creating sync log:', error);
    // Don't throw - logging failure shouldn't break the main operation
    return null;
  }
}

/**
 * Get logs with filtering (Requirement 10.5)
 * 
 * @param {Object} filters - Filter criteria
 * @param {string} filters.invoiceId - Filter by invoice ID
 * @param {string} filters.companyId - Filter by company ID
 * @param {string} filters.eventType - Filter by event type
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.limit - Maximum number of logs to return
 * @returns {Promise<Array<SyncLog>>} Array of sync logs
 */
async function getLogs(filters = {}) {
  try {
    return await SyncLog.findWithFilters(filters);
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    throw error;
  }
}

/**
 * Get logs for a specific invoice
 * 
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Array<SyncLog>>} Array of sync logs for the invoice
 */
async function getInvoiceLogs(invoiceId) {
  try {
    return await SyncLog.findByInvoice(invoiceId);
  } catch (error) {
    console.error('Error fetching invoice logs:', error);
    throw error;
  }
}

/**
 * Get logs for a specific company
 * 
 * @param {string} companyId - Company ID
 * @param {number} limit - Maximum number of logs (default: 100)
 * @returns {Promise<Array<SyncLog>>} Array of sync logs for the company
 */
async function getCompanyLogs(companyId, limit = 100) {
  try {
    return await SyncLog.findByCompany(companyId, limit);
  } catch (error) {
    console.error('Error fetching company logs:', error);
    throw error;
  }
}

/**
 * Log invoice import event
 * 
 * @param {string} invoiceId - Invoice ID
 * @param {string} companyId - Company ID (seller)
 * @param {string} status - Status (success/failed)
 * @param {string} errorMessage - Error message if failed
 * @returns {Promise<SyncLog>} Created log entry
 */
async function logImportEvent(invoiceId, companyId, status, errorMessage = null) {
  return await createLog({
    eventType: 'import_from_tally',
    invoiceId,
    companyId,
    status,
    errorMessage
  });
}

/**
 * Log push to Tally attempt
 * 
 * @param {string} invoiceId - Invoice ID
 * @param {string} companyId - Company ID (buyer)
 * @returns {Promise<SyncLog>} Created log entry
 */
async function logPushAttempt(invoiceId, companyId) {
  return await createLog({
    eventType: 'push_to_tally_attempt',
    invoiceId,
    companyId,
    status: 'started'
  });
}

/**
 * Log push to Tally success
 * 
 * @param {string} invoiceId - Invoice ID
 * @param {string} companyId - Company ID (buyer)
 * @param {string} referenceId - Tally reference ID
 * @returns {Promise<SyncLog>} Created log entry
 */
async function logPushSuccess(invoiceId, companyId, referenceId) {
  return await createLog({
    eventType: 'push_to_tally_success',
    invoiceId,
    companyId,
    status: 'success',
    metadata: { referenceId }
  });
}

/**
 * Log push to Tally failure
 * 
 * @param {string} invoiceId - Invoice ID
 * @param {string} companyId - Company ID (buyer)
 * @param {string} errorMessage - Error message
 * @returns {Promise<SyncLog>} Created log entry
 */
async function logPushFailure(invoiceId, companyId, errorMessage) {
  return await createLog({
    eventType: 'push_to_tally_failed',
    invoiceId,
    companyId,
    status: 'failed',
    errorMessage
  });
}

/**
 * Get statistics for sync operations
 * 
 * @param {string} companyId - Company ID (optional, for company-specific stats)
 * @param {Date} startDate - Start date for stats (optional)
 * @param {Date} endDate - End date for stats (optional)
 * @returns {Promise<Object>} Statistics object
 */
async function getSyncStats(companyId = null, startDate = null, endDate = null) {
  try {
    const query = {};
    
    if (companyId) {
      query.companyId = companyId;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Get counts by event type
    const importAttempts = await SyncLog.countDocuments({ ...query, eventType: 'import_from_tally' });
    const matchSuccesses = await SyncLog.countDocuments({ ...query, eventType: 'buyer_match_success' });
    const matchFailures = await SyncLog.countDocuments({ ...query, eventType: 'buyer_match_failed' });
    const pushSuccesses = await SyncLog.countDocuments({ ...query, eventType: 'push_to_tally_success' });
    const pushFailures = await SyncLog.countDocuments({ ...query, eventType: 'push_to_tally_failed' });
    
    // Calculate success rates
    const matchSuccessRate = matchSuccesses + matchFailures > 0
      ? ((matchSuccesses / (matchSuccesses + matchFailures)) * 100).toFixed(2)
      : 0;
    
    const pushSuccessRate = pushSuccesses + pushFailures > 0
      ? ((pushSuccesses / (pushSuccesses + pushFailures)) * 100).toFixed(2)
      : 0;
    
    return {
      imports: {
        total: importAttempts
      },
      matching: {
        successes: matchSuccesses,
        failures: matchFailures,
        successRate: `${matchSuccessRate}%`
      },
      push: {
        successes: pushSuccesses,
        failures: pushFailures,
        successRate: `${pushSuccessRate}%`
      }
    };
  } catch (error) {
    console.error('Error fetching sync stats:', error);
    throw error;
  }
}

module.exports = {
  createLog,
  getLogs,
  getInvoiceLogs,
  getCompanyLogs,
  logImportEvent,
  logPushAttempt,
  logPushSuccess,
  logPushFailure,
  getSyncStats
};
