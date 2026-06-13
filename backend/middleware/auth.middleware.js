/**
 * Authentication Middleware
 * 
 * Provides JWT token validation for protected routes and role-based access control.
 * 
 * Requirements: 1.3, 1.4, 1.5, 12.9
 */

const { verifyToken } = require('../config/jwt');

/**
 * Middleware to authenticate JWT token and attach user data to request
 * 
 * Requirements 1.3, 1.4: Extract user role and company ID from token payload, handle expiration
 */
const authenticateToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  // Handle missing token
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authentication token is required'
      }
    });
  }
  
  try {
    // Verify and decode token (Requirements 1.4, 17.5)
    const decoded = verifyToken(token);
    
    // Attach user data to request object (Requirement 1.3)
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId
    };
    
    next();
  } catch (error) {
    // Handle expired token (Requirement 1.4)
    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired. Please re-authenticate.'
        }
      });
    }
    
    // Handle invalid token signature
    if (error.message.includes('signature') || error.message.includes('format')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token signature or format'
        }
      });
    }
    
    // Generic token verification failure
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Token verification failed'
      }
    });
  }
};

/**
 * Middleware to check if user has required role
 * 
 * Requirement 1.5: Support three user roles
 * 
 * @param {Array<string>} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
          details: {
            requiredRoles: allowedRoles,
            userRole: req.user.role
          }
        }
      });
    }
    
    next();
  };
};

/**
 * Middleware to verify user has access to their own company data
 * Prevents users from accessing other companies' data
 */
const requireOwnCompany = (req, res, next) => {
  // Super admin can access all companies
  if (req.user.role === 'super_admin') {
    return next();
  }
  
  // Get company ID from request (could be in params, body, or query)
  const requestedCompanyId = req.params.companyId || req.body.companyId || req.query.companyId;
  
  // If no company ID in request, allow (will be handled by controller logic)
  if (!requestedCompanyId) {
    return next();
  }
  
  // Check if user is accessing their own company
  if (requestedCompanyId !== req.user.companyId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'WRONG_COMPANY_ACCESS',
        message: 'You can only access data from your own company'
      }
    });
  }
  
  next();
};

/**
 * Middleware for seller-only routes
 */
const requireSeller = [
  authenticateToken,
  requireRole(['seller_admin', 'super_admin'])
];

/**
 * Middleware for buyer-only routes
 */
const requireBuyer = [
  authenticateToken,
  requireRole(['buyer_admin', 'super_admin'])
];

/**
 * Middleware for super admin only routes
 */
const requireSuperAdmin = [
  authenticateToken,
  requireRole(['super_admin'])
];

/**
 * Middleware for any authenticated user
 */
const requireAuth = authenticateToken;

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnCompany,
  requireSeller,
  requireBuyer,
  requireSuperAdmin,
  requireAuth
};
