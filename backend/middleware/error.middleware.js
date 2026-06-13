/**
 * Error Handling Middleware
 * 
 * Centralized error handler with error categorization, logging, and user-friendly responses.
 * Never exposes internal details or stack traces to users.
 * 
 * Requirements: 15.3, 15.4
 */

/**
 * Error categories and their corresponding HTTP status codes
 */
const ERROR_CATEGORIES = {
  // Authentication errors (401)
  AUTHENTICATION: {
    status: 401,
    codes: ['MISSING_TOKEN', 'TOKEN_EXPIRED', 'INVALID_TOKEN', 'AUTHENTICATION_FAILED', 'INVALID_CREDENTIALS']
  },
  
  // Authorization errors (403)
  AUTHORIZATION: {
    status: 403,
    codes: ['INSUFFICIENT_PERMISSIONS', 'WRONG_COMPANY_ACCESS']
  },
  
  // Validation errors (400)
  VALIDATION: {
    status: 400,
    codes: ['INVALID_GSTIN', 'INVALID_EMAIL', 'INVALID_INVOICE_DATE', 'INVALID_TOTAL', 'MISSING_REQUIRED_FIELDS', 'INVALID_INPUT']
  },
  
  // Business logic errors (409, 400)
  BUSINESS_LOGIC: {
    status: 409,
    codes: ['DUPLICATE_INVOICE', 'INVOICE_ALREADY_PUSHED', 'NO_TALLY_CONFIG']
  },
  
  // External service errors (503, 502, 504)
  EXTERNAL_SERVICE: {
    status: 503,
    codes: ['TALLY_UNAVAILABLE', 'TALLY_TIMEOUT', 'TALLY_ERROR']
  },
  
  // Database errors (503, 504, 409)
  DATABASE: {
    status: 503,
    codes: ['DB_CONNECTION_FAILED', 'DB_QUERY_TIMEOUT', 'DUPLICATE_KEY']
  }
};

/**
 * Log error with details for debugging (Requirement 15.3)
 * 
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 */
const logError = (error, req) => {
  const timestamp = new Date().toISOString();
  const requestId = req.id || 'N/A';
  const userId = req.user ? req.user.userId : 'Unauthenticated';
  const companyId = req.user ? req.user.companyId : 'N/A';
  
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`[ERROR] ${timestamp}`);
  console.error(`Request ID: ${requestId}`);
  console.error(`User ID: ${userId}`);
  console.error(`Company ID: ${companyId}`);
  console.error(`Endpoint: ${req.method} ${req.originalUrl}`);
  console.error(`Error Type: ${error.name || 'Error'}`);
  console.error(`Error Message: ${error.message}`);
  
  // Log request body (sanitized - no credentials)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields
    delete sanitizedBody.password;
    delete sanitizedBody.passwordHash;
    delete sanitizedBody.credentials;
    delete sanitizedBody.encryptedCredentials;
    console.error(`Request Body:`, JSON.stringify(sanitizedBody, null, 2));
  }
  
  // Log stack trace for server errors
  if (error.stack) {
    console.error(`Stack Trace:\n${error.stack}`);
  }
  
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

/**
 * Determine error status code based on error code or type
 * 
 * @param {string} errorCode - Error code
 * @param {string} errorName - Error name
 * @returns {number} HTTP status code
 */
const getErrorStatus = (errorCode, errorName) => {
  // Check error categories
  for (const category in ERROR_CATEGORIES) {
    const { status, codes } = ERROR_CATEGORIES[category];
    if (codes.includes(errorCode)) {
      return status;
    }
  }
  
  // Mongoose/MongoDB specific errors
  if (errorName === 'ValidationError') return 400;
  if (errorName === 'CastError') return 400;
  if (errorCode === 11000) return 409; // Duplicate key
  
  // Default to 500 for unknown errors
  return 500;
};

/**
 * Format error response for client (Requirement 15.4)
 * Never expose internal details or stack traces
 * 
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (error, req) => {
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  const statusCode = error.statusCode || getErrorStatus(errorCode, error.name);
  
  // Base error response
  const response = {
    success: false,
    error: {
      code: errorCode,
      message: error.message || 'An error occurred while processing your request'
    }
  };
  
  // Add details if available (non-sensitive)
  if (error.details && typeof error.details === 'object') {
    response.error.details = error.details;
  }
  
  // For validation errors, include field-specific details
  if (error.name === 'ValidationError' && error.errors) {
    response.error.details = {};
    for (const field in error.errors) {
      response.error.details[field] = error.errors[field].message;
    }
  }
  
  // For duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    response.error.code = 'DUPLICATE_KEY';
    response.error.message = `A record with this ${field} already exists`;
    response.error.details = { field };
  }
  
  return { statusCode, response };
};

/**
 * Central error handling middleware
 * 
 * Must be registered as the last middleware in Express app
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error with full details (Requirement 15.3)
  logError(err, req);
  
  // Format user-friendly error response (Requirement 15.4)
  const { statusCode, response } = formatErrorResponse(err, req);
  
  // Send error response
  res.status(statusCode).json(response);
};

/**
 * Async error wrapper to catch errors in async route handlers
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.get('/invoices', asyncHandler(async (req, res) => {
 *   const invoices = await Invoice.find();
 *   res.json(invoices);
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 * Should be registered before error handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.code = 'ROUTE_NOT_FOUND';
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  logError,
  formatErrorResponse
};
