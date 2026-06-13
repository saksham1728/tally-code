/**
 * Company Controller
 * 
 * Handles company profile management and Tally connection configuration.
 * 
 * Requirements: 2.4, 2.5, 3.1, 3.3, 3.4
 */

const Company = require('../models/Company');
const TallyConnection = require('../models/TallyConnection');
const { encryptCredentials, decryptCredentials } = require('../config/encryption');
const TallyConnector = require('../integrations/TallyConnector');
const MockConnector = require('../integrations/MockConnector');

/**
 * Get current user's company
 * 
 * GET /api/company/me
 * 
 * Requirement 2.4: Display company details including Tally connection status
 */
const getMyCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.companyId);
    
    if (!company) {
      const error = new Error('Company not found');
      error.code = 'COMPANY_NOT_FOUND';
      error.statusCode = 404;
      return next(error);
    }
    
    // Get Tally connection status
    const tallyConnection = await TallyConnection.findOne({ companyId: company._id });
    
    res.json({
      success: true,
      data: {
        company: {
          _id: company._id,
          name: company.name,
          gstin: company.gstin,
          email: company.email,
          phone: company.phone,
          companyType: company.companyType,
          createdAt: company.createdAt
        },
        tallyConnection: tallyConnection ? {
          connected: tallyConnection.connectionStatus === 'connected',
          status: tallyConnection.connectionStatus,
          lastTestedAt: tallyConnection.lastTestedAt,
          lastError: tallyConnection.lastError
        } : null
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update company details
 * 
 * PUT /api/company/me
 * 
 * Requirement 2.5: Allow updating contact details
 */
const updateCompany = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    
    const company = await Company.findById(req.user.companyId);
    
    if (!company) {
      const error = new Error('Company not found');
      error.code = 'COMPANY_NOT_FOUND';
      error.statusCode = 404;
      return next(error);
    }
    
    // Update allowed fields only
    if (email) company.email = email;
    if (phone) company.phone = phone;
    
    await company.save();
    
    res.json({
      success: true,
      data: {
        company: {
          _id: company._id,
          name: company.name,
          gstin: company.gstin,
          email: company.email,
          phone: company.phone,
          companyType: company.companyType
        }
      },
      message: 'Company details updated successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Configure Tally connection
 * 
 * POST /api/company/tally-connection
 * 
 * Requirement 3.1: Store Tally connection configuration securely
 */
const configureTallyConnection = async (req, res, next) => {
  try {
    const { apiEndpoint, username, password } = req.body;
    
    // Validate required fields
    if (!apiEndpoint || !username || !password) {
      const error = new Error('API endpoint, username, and password are required');
      error.code = 'MISSING_REQUIRED_FIELDS';
      return next(error);
    }
    
    // Encrypt credentials (Requirement 3.2)
    const credentials = { username, password };
    const encryptedCredentials = encryptCredentials(credentials);
    
    // Check if connection already exists
    let tallyConnection = await TallyConnection.findOne({ companyId: req.user.companyId });
    
    if (tallyConnection) {
      // Update existing connection
      tallyConnection.apiEndpoint = apiEndpoint;
      tallyConnection.encryptedCredentials = encryptedCredentials;
      tallyConnection.connectionStatus = 'disconnected';
      tallyConnection.lastError = null;
    } else {
      // Create new connection
      tallyConnection = new TallyConnection({
        companyId: req.user.companyId,
        apiEndpoint,
        encryptedCredentials,
        connectionStatus: 'disconnected'
      });
    }
    
    await tallyConnection.save();
    
    res.json({
      success: true,
      data: {
        tallyConnection: {
          _id: tallyConnection._id,
          apiEndpoint: tallyConnection.apiEndpoint,
          connectionStatus: tallyConnection.connectionStatus
        }
      },
      message: 'Tally connection configured successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Test Tally connection
 * 
 * POST /api/company/test-connection
 * 
 * Requirement 3.3: Verify connectivity within 10 seconds
 */
const testConnection = async (req, res, next) => {
  try {
    const tallyConnection = await TallyConnection.findOne({ companyId: req.user.companyId });
    
    if (!tallyConnection) {
      const error = new Error('Tally connection not configured. Please configure it first.');
      error.code = 'NO_TALLY_CONFIG';
      return next(error);
    }
    
    // Decrypt credentials
    const credentials = decryptCredentials(tallyConnection.encryptedCredentials);
    
    // Prepare connection config
    const connectionConfig = {
      apiEndpoint: tallyConnection.apiEndpoint,
      credentials
    };
    
    // Get appropriate connector based on integration mode
    const integrationMode = process.env.INTEGRATION_MODE || 'mock';
    const connector = integrationMode === 'mock' ? new MockConnector() : new TallyConnector();
    
    // Test connection (Requirement 3.3: within 10 seconds)
    const result = await connector.testConnection(connectionConfig);
    
    // Update connection status
    if (result.success) {
      await tallyConnection.updateStatus('connected');
    } else {
      await tallyConnection.updateStatus('error', result.message);
    }
    
    res.json({
      success: true,
      data: {
        connected: result.success,
        message: result.message,
        connectionStatus: result.success ? 'connected' : 'error'
      }
    });
    
  } catch (error) {
    // Update connection status to error
    const tallyConnection = await TallyConnection.findOne({ companyId: req.user.companyId });
    if (tallyConnection) {
      await tallyConnection.updateStatus('error', error.message);
    }
    
    next(error);
  }
};

/**
 * Get Tally connection details
 * 
 * GET /api/company/tally-connection
 */
const getTallyConnection = async (req, res, next) => {
  try {
    const tallyConnection = await TallyConnection.findOne({ companyId: req.user.companyId });
    
    if (!tallyConnection) {
      return res.json({
        success: true,
        data: {
          tallyConnection: null
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        tallyConnection: {
          _id: tallyConnection._id,
          apiEndpoint: tallyConnection.apiEndpoint,
          connectionStatus: tallyConnection.connectionStatus,
          lastTestedAt: tallyConnection.lastTestedAt,
          lastError: tallyConnection.lastError
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyCompany,
  updateCompany,
  configureTallyConnection,
  testConnection,
  getTallyConnection
};
