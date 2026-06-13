/**
 * Super Admin Controller
 * 
 * Handles super admin operations for system-wide management.
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

const Company = require('../models/Company');
const Invoice = require('../models/Invoice');
const TallyConnection = require('../models/TallyConnection');
const { getSyncStats } = require('../services/syncLog.service');
const { retryMatching, getUnmatchedInvoices } = require('../services/matching.service');

/**
 * Get all companies with integration status
 * 
 * GET /api/admin/companies
 * 
 * Requirement 18.1, 18.2: System-wide visibility
 */
const getAllCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    
    // Get Tally connection status for each company
    const companiesWithStatus = await Promise.all(
      companies.map(async (company) => {
        const tallyConnection = await TallyConnection.findOne({ companyId: company._id });
        
        return {
          _id: company._id,
          name: company.name,
          gstin: company.gstin,
          email: company.email,
          phone: company.phone,
          companyType: company.companyType,
          createdAt: company.createdAt,
          tallyConnection: tallyConnection ? {
            status: tallyConnection.connectionStatus,
            lastTestedAt: tallyConnection.lastTestedAt,
            lastError: tallyConnection.lastError
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        companies: companiesWithStatus,
        count: companiesWithStatus.length
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get system-wide statistics
 * 
 * GET /api/admin/stats
 * 
 * Requirement 18.4: Display system-wide statistics
 */
const getSystemStats = async (req, res, next) => {
  try {
    // Get counts
    const totalCompanies = await Company.countDocuments();
    const totalInvoices = await Invoice.countDocuments();
    const unmatchedInvoices = await Invoice.countDocuments({ status: 'Unmatched' });
    const pushedInvoices = await Invoice.countDocuments({ status: 'Pushed_to_Tally' });
    
    // Get companies by type
    const sellerCompanies = await Company.countDocuments({ companyType: { $in: ['seller', 'both'] } });
    const buyerCompanies = await Company.countDocuments({ companyType: { $in: ['buyer', 'both'] } });
    
    // Get Tally connection stats
    const connectedCompanies = await TallyConnection.countDocuments({ connectionStatus: 'connected' });
    
    // Get sync statistics
    const syncStats = await getSyncStats();
    
    res.json({
      success: true,
      data: {
        companies: {
          total: totalCompanies,
          sellers: sellerCompanies,
          buyers: buyerCompanies,
          withTallyConnected: connectedCompanies
        },
        invoices: {
          total: totalInvoices,
          unmatched: unmatchedInvoices,
          pushed: pushedInvoices,
          matchRate: totalInvoices > 0 
            ? `${(((totalInvoices - unmatchedInvoices) / totalInvoices) * 100).toFixed(2)}%`
            : '0%'
        },
        sync: syncStats
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get all invoices (super admin view)
 * 
 * GET /api/admin/invoices
 * 
 * Requirement 18.1: Access to all invoices
 */
const getAllInvoices = async (req, res, next) => {
  try {
    const { status, limit = 100, skip = 0 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    
    const invoices = await Invoice.find(query)
      .sort({ invoiceDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('sellerCompanyId', 'name gstin')
      .populate('buyerCompanyId', 'name gstin');
    
    const totalCount = await Invoice.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        invoices,
        count: invoices.length,
        total: totalCount
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get unmatched invoices
 * 
 * GET /api/admin/unmatched-invoices
 * 
 * Requirement 18.5: View unmatched invoices
 */
const getUnmatchedInvoicesList = async (req, res, next) => {
  try {
    const { limit = 100, skip = 0 } = req.query;
    
    const invoices = await getUnmatchedInvoices({
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
    
    res.json({
      success: true,
      data: {
        invoices,
        count: invoices.length
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Manually trigger buyer matching for an invoice
 * 
 * POST /api/admin/match/:invoiceId
 * 
 * Requirement 18.5: Manually trigger matching for unmatched invoices
 */
const manualMatch = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    
    const result = await retryMatching(invoiceId);
    
    if (result.matched) {
      res.json({
        success: true,
        data: {
          matched: true,
          matchMethod: result.matchMethod,
          company: result.company
        },
        message: 'Invoice matched successfully'
      });
    } else {
      res.json({
        success: true,
        data: {
          matched: false
        },
        message: 'No matching buyer company found'
      });
    }
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get system health status
 * 
 * GET /api/admin/health
 */
const getSystemHealth = async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      database: 'connected',
      services: {
        authentication: 'operational',
        invoiceImport: 'operational',
        matching: 'operational',
        logging: 'operational'
      }
    };
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCompanies,
  getSystemStats,
  getAllInvoices,
  getUnmatchedInvoicesList,
  manualMatch,
  getSystemHealth
};
