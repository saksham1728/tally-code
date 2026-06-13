/**
 * Field Mapping Routes
 * 
 * Defines routes for field mapping configuration.
 */

const express = require('express');
const router = express.Router();
const {
  getFieldMapping,
  updateFieldMapping,
  getAvailableTallyFields,
  resetFieldMapping
} = require('../controllers/fieldMapping.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { sanitizeRequestBody } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// All field mapping routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/field-mapping
 * @desc    Get current field mapping configuration
 * @access  Private
 */
router.get('/', asyncHandler(getFieldMapping));

/**
 * @route   PUT /api/field-mapping
 * @desc    Update field mapping configuration
 * @access  Private
 */
router.put('/', sanitizeRequestBody, asyncHandler(updateFieldMapping));

/**
 * @route   GET /api/field-mapping/available-fields
 * @desc    Get available Tally fields from sample data
 * @access  Private
 */
router.get('/available-fields', asyncHandler(getAvailableTallyFields));

/**
 * @route   POST /api/field-mapping/reset
 * @desc    Reset field mapping to defaults
 * @access  Private
 */
router.post('/reset', asyncHandler(resetFieldMapping));

module.exports = router;
