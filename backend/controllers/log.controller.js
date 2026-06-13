/**
 * Log Controller
 * 
 * Handles sync log operations.
 * 
 * Requirements: 10.4, 10.5
 */

const { getLogs, getInvoiceLogs, getCompanyLogs } = require('../services/syncLog.service');

/**
 * Get sync logs with filtering
 * 
 * GET /api/logs
 * 
 * Requirement 10.4, 10.5: Filter logs and display in reverse chronological order
 */
const getSyncLogs = async (req, res, next) => {
  try {
    const { invoiceId, companyId, eventType, startDate, endDate, limit } = req.query;
    const userRole = req.user.role;
    const userCompanyId = req.user.companyId;
    
    // Build filters
    const filters = {};
    
    if (invoiceId) filters.invoiceId = invoiceId;
    if (eventType) filters.eventType = eventType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = parseInt(limit);
    
    // Apply role-based filtering
    if (userRole === 'super_admin') {
      // Super admin can see all logs
      if (companyId) filters.companyId = companyId;
    } else {
      // Regular users can only see their company's logs
      filters.companyId = userCompanyId;
    }
    
    const logs = await getLogs(filters);
    
    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get logs for a specific invoice
 * 
 * GET /api/logs/invoice/:invoiceId
 */
const getInvoiceLogHistory = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    
    const logs = await getInvoiceLogs(invoiceId);
    
    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get logs for current user's company
 * 
 * GET /api/logs/my-company
 */
const getMyCompanyLogs = async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    const companyId = req.user.companyId;
    
    const logs = await getCompanyLogs(companyId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSyncLogs,
  getInvoiceLogHistory,
  getMyCompanyLogs
};
