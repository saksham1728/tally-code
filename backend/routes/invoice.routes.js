/**
 * Invoice Routes
 * 
 * Defines routes for invoice operations.
 * 
 * Requirements: 12.3, 12.4, 12.5, 12.6
 */

const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoiceById,
  importFromTally,
  pushToTally,
  updateStatus
} = require('../controllers/invoice.controller');
const { authenticateToken, requireSeller, requireBuyer } = require('../middleware/auth.middleware');
const { sanitizeRequestBody } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// All invoice routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/invoices
 * @desc    Get invoices (filtered by user role and company)
 * @access  Private
 */
router.get('/', asyncHandler(getInvoices));

/**
 * @route   GET /api/invoices/:id
 * @desc    Get invoice details with line items
 * @access  Private
 */
router.get('/:id', asyncHandler(getInvoiceById));

/**
 * @route   POST /api/invoices/import-from-tally
 * @desc    Import invoices from seller's Tally
 * @access  Private (Seller only)
 */
router.post('/import-from-tally', requireSeller, sanitizeRequestBody, asyncHandler(importFromTally));

/**
 * @route   POST /api/invoices/:id/push-to-tally
 * @desc    Push invoice to buyer's Tally
 * @access  Private (Buyer only)
 */
router.post('/:id/push-to-tally', requireBuyer, asyncHandler(pushToTally));

/**
 * @route   PUT /api/invoices/:id/status
 * @desc    Update invoice status (Accept/Reject)
 * @access  Private (Buyer only)
 */
router.put('/:id/status', requireBuyer, sanitizeRequestBody, asyncHandler(updateStatus));

module.exports = router;
