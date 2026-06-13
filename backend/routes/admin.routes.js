/**
 * Admin Routes
 * 
 * Defines routes for super admin operations.
 */

const express = require('express');
const router = express.Router();
const {
  getAllCompanies,
  getSystemStats,
  getAllInvoices,
  getUnmatchedInvoicesList,
  manualMatch,
  getSystemHealth
} = require('../controllers/admin.controller');
const { requireSuperAdmin } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// All admin routes require super admin role
router.use(requireSuperAdmin);

/**
 * @route   GET /api/admin/companies
 * @desc    Get all companies with integration status
 * @access  Private (Super Admin only)
 */
router.get('/companies', asyncHandler(getAllCompanies));

/**
 * @route   GET /api/admin/stats
 * @desc    Get system-wide statistics
 * @access  Private (Super Admin only)
 */
router.get('/stats', asyncHandler(getSystemStats));

/**
 * @route   GET /api/admin/invoices
 * @desc    Get all invoices (super admin view)
 * @access  Private (Super Admin only)
 */
router.get('/invoices', asyncHandler(getAllInvoices));

/**
 * @route   GET /api/admin/unmatched-invoices
 * @desc    Get all unmatched invoices
 * @access  Private (Super Admin only)
 */
router.get('/unmatched-invoices', asyncHandler(getUnmatchedInvoicesList));

/**
 * @route   POST /api/admin/match/:invoiceId
 * @desc    Manually trigger buyer matching for an invoice
 * @access  Private (Super Admin only)
 */
router.post('/match/:invoiceId', asyncHandler(manualMatch));

/**
 * @route   GET /api/admin/health
 * @desc    Get system health status
 * @access  Private (Super Admin only)
 */
router.get('/health', asyncHandler(getSystemHealth));

module.exports = router;
