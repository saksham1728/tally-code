/**
 * Company Routes
 * 
 * Defines routes for company management operations.
 * 
 * Requirements: 12.8
 */

const express = require('express');
const router = express.Router();
const {
  getMyCompany,
  updateCompany,
  configureTallyConnection,
  testConnection,
  getTallyConnection
} = require('../controllers/company.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { sanitizeRequestBody, validateEmailMiddleware } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// All company routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/company/me
 * @desc    Get current user's company details
 * @access  Private
 */
router.get('/me', asyncHandler(getMyCompany));

/**
 * @route   PUT /api/company/me
 * @desc    Update company contact details
 * @access  Private
 */
router.put('/me', sanitizeRequestBody, asyncHandler(updateCompany));

/**
 * @route   GET /api/company/tally-connection
 * @desc    Get Tally connection details
 * @access  Private
 */
router.get('/tally-connection', asyncHandler(getTallyConnection));

/**
 * @route   POST /api/company/tally-connection
 * @desc    Configure Tally connection
 * @access  Private
 */
router.post('/tally-connection', sanitizeRequestBody, asyncHandler(configureTallyConnection));

/**
 * @route   POST /api/company/test-connection
 * @desc    Test Tally connection
 * @access  Private
 */
router.post('/test-connection', asyncHandler(testConnection));

module.exports = router;
