/**
 * Log Routes
 * 
 * Defines routes for sync log operations.
 * 
 * Requirements: 12.7
 */

const express = require('express');
const router = express.Router();
const {
  getSyncLogs,
  getInvoiceLogHistory,
  getMyCompanyLogs
} = require('../controllers/log.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// All log routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/logs
 * @desc    Get sync logs with filters
 * @access  Private
 */
router.get('/', asyncHandler(getSyncLogs));

/**
 * @route   GET /api/logs/invoice/:invoiceId
 * @desc    Get logs for a specific invoice
 * @access  Private
 */
router.get('/invoice/:invoiceId', asyncHandler(getInvoiceLogHistory));

/**
 * @route   GET /api/logs/my-company
 * @desc    Get logs for current user's company
 * @access  Private
 */
router.get('/my-company', asyncHandler(getMyCompanyLogs));

module.exports = router;
