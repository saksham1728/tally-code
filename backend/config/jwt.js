/**
 * JWT Configuration Module
 * 
 * Provides JWT token generation and verification utilities for authentication.
 * 
 * Requirements:
 * - 1.1: Generate JWT token within 2 seconds for valid credentials
 * - 1.3: Include user role and company ID in JWT token payload
 * - 1.4: Validate JWT token expiration and require re-authentication
 * - 17.5: Validate JWT token signature and expiration for protected endpoints
 */

const jwt = require('jsonwebtoken');

/**
 * JWT Configuration
 */
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

/**
 * Generate JWT token for authenticated user
 * 
 * @param {Object} user - User object from database
 * @param {string} user._id - User ID
 * @param {string} user.email - User email
 * @param {string} user.role - User role (seller_admin, buyer_admin, super_admin)
 * @param {string} user.companyId - Company ID (required for non-super_admin roles)
 * @returns {string} JWT token
 * 
 * @example
 * const token = generateToken({
 *   _id: '507f1f77bcf86cd799439011',
 *   email: 'admin@company.com',
 *   role: 'seller_admin',
 *   companyId: '507f1f77bcf86cd799439012'
 * });
 */
function generateToken(user) {
  // Build payload with required fields (Requirements 1.3)
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    companyId: user.companyId ? user.companyId.toString() : null
  };

  // Generate token with expiration (Requirements 1.1, 1.4)
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    algorithm: 'HS256'
  });

  return token;
}

/**
 * Verify JWT token and decode payload
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid, expired, or signature verification fails
 * 
 * @example
 * try {
 *   const decoded = verifyToken(token);
 *   console.log(decoded.userId, decoded.role, decoded.companyId);
 * } catch (error) {
 *   console.error('Token verification failed:', error.message);
 * }
 */
function verifyToken(token) {
  try {
    // Verify token signature and expiration (Requirements 1.4, 17.5)
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });

    return decoded;
  } catch (error) {
    // Re-throw with more specific error messages
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired. Please re-authenticate.');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token signature or format.');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not active yet.');
    } else {
      throw new Error('Token verification failed.');
    }
  }
}

/**
 * Decode JWT token without verification (for debugging/logging only)
 * 
 * WARNING: This does not verify the token signature or expiration.
 * Only use for non-security-critical operations like logging.
 * 
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid format
 * 
 * @example
 * const decoded = decodeToken(token);
 * if (decoded) {
 *   console.log('Token issued for user:', decoded.userId);
 * }
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRATION,
  generateToken,
  verifyToken,
  decodeToken
};
