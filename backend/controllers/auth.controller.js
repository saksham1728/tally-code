/**
 * Authentication Controller
 * 
 * Handles user registration and login operations.
 * 
 * Requirements: 1.1, 1.2, 1.3, 2.1
 */

const User = require('../models/User');
const Company = require('../models/Company');
const { generateToken } = require('../config/jwt');
const { validateEmail, validateGSTIN } = require('../middleware/validation.middleware');

/**
 * Register new user and company
 * 
 * POST /api/auth/register
 * 
 * @param {Object} req.body - Registration data
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {string} req.body.role - User role (seller_admin, buyer_admin)
 * @param {string} req.body.companyName - Company name
 * @param {string} req.body.gstin - Company GSTIN
 * @param {string} req.body.phone - Company phone
 * @param {string} req.body.companyType - Company type (seller, buyer, both)
 */
const register = async (req, res, next) => {
  try {
    const { email, password, role, companyName, gstin, phone, companyType, companyEmail } = req.body;
    
    // Validate required fields
    if (!email || !password || !role || !companyName || !gstin || !companyType) {
      const error = new Error('Missing required fields');
      error.code = 'MISSING_REQUIRED_FIELDS';
      error.details = {
        required: ['email', 'password', 'role', 'companyName', 'gstin', 'companyType']
      };
      return next(error);
    }
    
    // Validate email format (Requirement 14.2)
    if (!validateEmail(email)) {
      const error = new Error('Invalid email format');
      error.code = 'INVALID_EMAIL';
      return next(error);
    }
    
    // Validate GSTIN format (Requirement 14.1)
    if (!validateGSTIN(gstin)) {
      const error = new Error('GSTIN must be exactly 15 alphanumeric characters');
      error.code = 'INVALID_GSTIN';
      return next(error);
    }
    
    // Validate role
    if (!['seller_admin', 'buyer_admin'].includes(role)) {
      const error = new Error('Invalid role. Must be seller_admin or buyer_admin');
      error.code = 'INVALID_ROLE';
      return next(error);
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.code = 'DUPLICATE_KEY';
      error.statusCode = 409;
      return next(error);
    }
    
    // Check if company with GSTIN already exists
    const existingCompany = await Company.findOne({ gstin: gstin.toUpperCase() });
    if (existingCompany) {
      const error = new Error('Company with this GSTIN already exists');
      error.code = 'DUPLICATE_KEY';
      error.statusCode = 409;
      return next(error);
    }
    
    // Create company first (Requirement 2.1)
    const company = new Company({
      name: companyName,
      gstin: gstin.toUpperCase(),
      email: companyEmail || email,
      phone,
      companyType
    });
    
    await company.save();
    
    // Create user with reference to company
    const user = new User({
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      role,
      companyId: company._id
    });
    
    await user.save();
    
    // Generate JWT token (Requirements 1.1, 1.3)
    const token = generateToken(user);
    
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          companyId: user.companyId
        },
        company: {
          _id: company._id,
          name: company.name,
          gstin: company.gstin,
          companyType: company.companyType
        }
      },
      message: 'Registration successful'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * 
 * POST /api/auth/login
 * 
 * @param {Object} req.body - Login credentials
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.code = 'MISSING_REQUIRED_FIELDS';
      return next(error);
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).populate('companyId');
    
    // Check if user exists (Requirement 1.2)
    if (!user) {
      const error = new Error('Invalid email or password');
      error.code = 'INVALID_CREDENTIALS';
      error.statusCode = 401;
      return next(error);
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.code = 'INVALID_CREDENTIALS';
      error.statusCode = 401;
      return next(error);
    }
    
    // Generate JWT token (Requirements 1.1, 1.3)
    const token = generateToken(user);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          companyId: user.companyId._id
        },
        company: {
          _id: user.companyId._id,
          name: user.companyId.name,
          gstin: user.companyId.gstin,
          companyType: user.companyId.companyType
        }
      },
      message: 'Login successful'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user
 * 
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-passwordHash')
      .populate('companyId');
    
    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.statusCode = 404;
      return next(error);
    }
    
    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
          companyId: user.companyId._id
        },
        company: {
          _id: user.companyId._id,
          name: user.companyId.name,
          gstin: user.companyId.gstin,
          email: user.companyId.email,
          phone: user.companyId.phone,
          companyType: user.companyId.companyType
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};
