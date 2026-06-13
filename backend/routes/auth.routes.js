/**
 * Authentication Routes
 * 
 * Defines routes for user authentication operations.
 * 
 * Requirements: 12.1, 12.2
 */

const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { sanitizeRequestBody } = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user and company
 * @access  Public
 */
router.post('/register', sanitizeRequestBody, asyncHandler(register));

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get JWT token
 * @access  Public
 */
router.post('/login', sanitizeRequestBody, asyncHandler(login));

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticateToken, asyncHandler(getMe));

module.exports = router;
