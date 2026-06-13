/**
 * Validation Middleware
 * 
 * Provides validation functions for input data including:
 * - GSTIN format validation
 * - Email format validation
 * - Invoice date validation
 * - Invoice total calculation validation
 * - Input sanitization for security
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

/**
 * Validate GSTIN format
 * GSTIN must be exactly 15 alphanumeric characters (Requirement 14.1)
 * 
 * @param {string} gstin - GSTIN to validate
 * @returns {boolean} True if valid, false otherwise
 */
const validateGSTIN = (gstin) => {
  if (!gstin || typeof gstin !== 'string') {
    return false;
  }
  
  // Remove any whitespace
  const cleanGSTIN = gstin.trim().toUpperCase();
  
  // Must be exactly 15 alphanumeric characters
  const gstinRegex = /^[A-Z0-9]{15}$/;
  return gstinRegex.test(cleanGSTIN);
};

/**
 * Validate email format
 * (Requirement 14.2)
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid, false otherwise
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Basic email format validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate invoice date
 * Date must not be in the future (Requirement 14.4)
 * 
 * @param {Date|string} date - Invoice date to validate
 * @returns {boolean} True if valid (not in future), false otherwise
 */
const validateInvoiceDate = (date) => {
  if (!date) {
    return false;
  }
  
  const invoiceDate = new Date(date);
  
  // Check if valid date
  if (isNaN(invoiceDate.getTime())) {
    return false;
  }
  
  // Date must not be in the future
  const now = new Date();
  return invoiceDate <= now;
};

/**
 * Validate invoice total calculation
 * Total amount must equal sum of taxable amount and tax amount (Requirement 14.3)
 * 
 * @param {number} taxableAmount - Taxable amount
 * @param {number} taxAmount - Tax amount
 * @param {number} totalAmount - Total amount to validate
 * @param {number} tolerance - Tolerance for floating point comparison (default: 0.01)
 * @returns {boolean} True if valid, false otherwise
 */
const validateInvoiceTotal = (taxableAmount, taxAmount, totalAmount, tolerance = 0.01) => {
  if (
    typeof taxableAmount !== 'number' ||
    typeof taxAmount !== 'number' ||
    typeof totalAmount !== 'number'
  ) {
    return false;
  }
  
  const expectedTotal = taxableAmount + taxAmount;
  const difference = Math.abs(expectedTotal - totalAmount);
  
  // Use tolerance for floating point comparison
  return difference <= tolerance;
};

/**
 * Sanitize user input to prevent injection attacks
 * Removes or escapes dangerous characters (Requirement 14.6)
 * 
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Escape HTML special characters to prevent XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Remove potential SQL injection patterns
  sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi, '');
  
  // Remove potential command injection patterns
  sanitized = sanitized.replace(/[;|&$`]/g, '');
  
  return sanitized.trim();
};

/**
 * Middleware to validate request body fields
 * 
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Function} Express middleware function
 */
const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!req.body[field] && req.body[field] !== 0 && req.body[field] !== false) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Missing required fields',
          details: {
            missingFields
          }
        }
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate GSTIN in request body
 */
const validateGSTINMiddleware = (req, res, next) => {
  const { gstin } = req.body;
  
  if (!gstin) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_GSTIN',
        message: 'GSTIN is required'
      }
    });
  }
  
  if (!validateGSTIN(gstin)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_GSTIN',
        message: 'GSTIN must be exactly 15 alphanumeric characters'
      }
    });
  }
  
  next();
};

/**
 * Middleware to validate email in request body
 */
const validateEmailMiddleware = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_EMAIL',
        message: 'Email is required'
      }
    });
  }
  
  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_EMAIL',
        message: 'Please provide a valid email address'
      }
    });
  }
  
  next();
};

/**
 * Middleware to validate invoice date in request body
 */
const validateInvoiceDateMiddleware = (req, res, next) => {
  const { invoiceDate } = req.body;
  
  if (!invoiceDate) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INVOICE_DATE',
        message: 'Invoice date is required'
      }
    });
  }
  
  if (!validateInvoiceDate(invoiceDate)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INVOICE_DATE',
        message: 'Invoice date cannot be in the future'
      }
    });
  }
  
  next();
};

/**
 * Middleware to validate invoice totals in request body
 */
const validateInvoiceTotalMiddleware = (req, res, next) => {
  const { taxableAmount, taxAmount, totalAmount } = req.body;
  
  if (
    typeof taxableAmount !== 'number' ||
    typeof taxAmount !== 'number' ||
    typeof totalAmount !== 'number'
  ) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_AMOUNTS',
        message: 'Taxable amount, tax amount, and total amount must be numbers'
      }
    });
  }
  
  if (!validateInvoiceTotal(taxableAmount, taxAmount, totalAmount)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_TOTAL',
        message: 'Total amount must equal taxable amount plus tax amount',
        details: {
          taxableAmount,
          taxAmount,
          expectedTotal: taxableAmount + taxAmount,
          providedTotal: totalAmount
        }
      }
    });
  }
  
  next();
};

/**
 * Middleware to sanitize all string fields in request body
 */
const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }
  
  next();
};

module.exports = {
  // Validation functions
  validateGSTIN,
  validateEmail,
  validateInvoiceDate,
  validateInvoiceTotal,
  sanitizeInput,
  
  // Middleware functions
  validateRequiredFields,
  validateGSTINMiddleware,
  validateEmailMiddleware,
  validateInvoiceDateMiddleware,
  validateInvoiceTotalMiddleware,
  sanitizeRequestBody
};
