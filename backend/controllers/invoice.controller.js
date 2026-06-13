/**
 * Invoice Controller
 * 
 * Handles invoice operations including import, push, and status management.
 * 
 * Requirements: 4.1-4.6, 6.1-6.6, 7.1-7.3, 9.1-9.6, 11.2-11.3
 */

const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const TallyConnection = require('../models/TallyConnection');
const Company = require('../models/Company');
const { decryptCredentials } = require('../config/encryption');
const { matchBuyerForInvoice } = require('../services/matching.service');
const { logImportEvent, logPushAttempt, logPushSuccess, logPushFailure } = require('../services/syncLog.service');
const TallyConnector = require('../integrations/TallyConnector');
const MockConnector = require('../integrations/MockConnector');

/**
 * Get invoices (filtered by user role and company)
 * 
 * GET /api/invoices
 * 
 * Requirements 6.1, 7.1: Filter by role and company
 */
const getInvoices = async (req, res, next) => {
  try {
    const { status, limit = 100, skip = 0 } = req.query;
    const userRole = req.user.role;
    const companyId = req.user.companyId;
    
    let invoices;
    
    // Super admin can see all invoices
    if (userRole === 'super_admin') {
      const query = {};
      if (status) query.status = status;
      
      invoices = await Invoice.find(query)
        .sort({ invoiceDate: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .populate('sellerCompanyId', 'name gstin email')
        .populate('buyerCompanyId', 'name gstin email');
        
    } else {
      // Get company type to determine if seller or buyer
      const company = await Company.findById(companyId);
      
      if (company.companyType === 'seller' || userRole === 'seller_admin') {
        // Seller dashboard (Requirement 6.1)
        invoices = await Invoice.findBySeller(companyId, { status, limit: parseInt(limit), skip: parseInt(skip) });
      } else if (company.companyType === 'buyer' || userRole === 'buyer_admin') {
        // Buyer dashboard (Requirement 7.1)
        invoices = await Invoice.findByBuyer(companyId, { status, limit: parseInt(limit), skip: parseInt(skip) });
      } else {
        // Company is "both" - show both seller and buyer invoices
        const sellerInvoices = await Invoice.findBySeller(companyId, { status, limit: parseInt(limit / 2) });
        const buyerInvoices = await Invoice.findByBuyer(companyId, { status, limit: parseInt(limit / 2) });
        invoices = [...sellerInvoices, ...buyerInvoices];
      }
    }
    
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
 * Get invoice by ID with line items
 * 
 * GET /api/invoices/:id
 * 
 * Requirement 6.5, 7.5: Display detailed invoice information
 */
const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findById(id)
      .populate('sellerCompanyId', 'name gstin email phone')
      .populate('buyerCompanyId', 'name gstin email phone');
    
    if (!invoice) {
      const error = new Error('Invoice not found');
      error.code = 'INVOICE_NOT_FOUND';
      error.statusCode = 404;
      return next(error);
    }
    
    // Check authorization (users can only see their company's invoices, except super_admin)
    if (req.user.role !== 'super_admin') {
      const isSeller = invoice.sellerCompanyId._id.toString() === req.user.companyId;
      const isBuyer = invoice.buyerCompanyId && invoice.buyerCompanyId._id.toString() === req.user.companyId;
      
      if (!isSeller && !isBuyer) {
        const error = new Error('Access denied to this invoice');
        error.code = 'WRONG_COMPANY_ACCESS';
        error.statusCode = 403;
        return next(error);
      }
    }
    
    // Get line items
    const lineItems = await InvoiceLineItem.findByInvoice(id);
    
    res.json({
      success: true,
      data: {
        invoice,
        lineItems
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Import invoices from Tally
 * 
 * POST /api/invoices/import-from-tally
 * 
 * Requirements 4.1-4.6: Import with duplicate prevention and auto-matching
 */
const importFromTally = async (req, res, next) => {
  try {
    const { startDate, endDate, limit } = req.body;
    const companyId = req.user.companyId;
    
    // Get Tally connection
    const tallyConnection = await TallyConnection.findOne({ companyId });
    
    if (!tallyConnection) {
      const error = new Error('Tally connection not configured');
      error.code = 'NO_TALLY_CONFIG';
      return next(error);
    }
    
    if (tallyConnection.connectionStatus !== 'connected') {
      const error = new Error('Tally connection is not active. Please test the connection first.');
      error.code = 'TALLY_NOT_CONNECTED';
      return next(error);
    }
    
    // Decrypt credentials
    const credentials = decryptCredentials(tallyConnection.encryptedCredentials);
    
    // Prepare connection config
    const connectionConfig = {
      apiEndpoint: tallyConnection.apiEndpoint,
      credentials
    };
    
    // Get appropriate connector
    const integrationMode = process.env.INTEGRATION_MODE || 'mock';
    const connector = integrationMode === 'mock' ? new MockConnector() : new TallyConnector();
    
    // Import invoices (Requirement 4.1)
    const tallyInvoices = await connector.importInvoices(connectionConfig, {
      startDate,
      endDate,
      limit
    }, tallyConnection.fieldMapping);
    
    const importedInvoices = [];
    const skippedInvoices = [];
    const errors = [];
    
    // Process each invoice
    for (const tallyInvoice of tallyInvoices) {
      try {
        // Check for duplicate (Requirement 4.5)
        const isDuplicate = await Invoice.isAlreadyImported(tallyInvoice.sourceReferenceId);
        
        if (isDuplicate) {
          skippedInvoices.push({
            invoiceNumber: tallyInvoice.invoiceNumber,
            reason: 'Duplicate invoice'
          });
          continue;
        }
        
        // Create invoice (Requirement 4.2, 4.3)
        const invoice = new Invoice({
          invoiceNumber: tallyInvoice.invoiceNumber,
          invoiceDate: tallyInvoice.invoiceDate,
          sellerCompanyId: companyId,
          buyerCompanyName: tallyInvoice.buyerCompanyName,
          buyerGSTIN: tallyInvoice.buyerGSTIN,
          taxableAmount: tallyInvoice.taxableAmount,
          taxAmount: tallyInvoice.taxAmount,
          totalAmount: tallyInvoice.totalAmount,
          status: 'New',
          sourceReferenceId: tallyInvoice.sourceReferenceId,
          rawPayload: tallyInvoice.rawPayload
        });
        
        await invoice.save();
        
        // Create line items
        for (const lineItem of tallyInvoice.lineItems) {
          const invoiceLineItem = new InvoiceLineItem({
            invoiceId: invoice._id,
            ...lineItem
          });
          await invoiceLineItem.save();
        }
        
        // Log successful import
        await logImportEvent(invoice._id, companyId, 'success');
        
        // Trigger buyer matching (Requirement 4.6)
        await matchBuyerForInvoice(invoice._id);
        
        importedInvoices.push({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          buyerCompanyName: invoice.buyerCompanyName,
          totalAmount: invoice.totalAmount,
          status: invoice.status
        });
        
      } catch (error) {
        errors.push({
          invoiceNumber: tallyInvoice.invoiceNumber,
          error: error.message
        });
        
        // Log failed import
        await logImportEvent(null, companyId, 'failed', error.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        imported: importedInvoices,
        importedCount: importedInvoices.length,
        skipped: skippedInvoices,
        skippedCount: skippedInvoices.length,
        errors: errors,
        errorCount: errors.length
      },
      message: `Successfully imported ${importedInvoices.length} invoices`
    });
    
  } catch (error) {
    // Log error (Requirement 4.4)
    await logImportEvent(null, req.user.companyId, 'failed', error.message);
    next(error);
  }
};

/**
 * Push invoice to buyer's Tally
 * 
 * POST /api/invoices/:id/push-to-tally
 * 
 * Requirements 9.1-9.6: One-click push with status tracking
 */
const pushToTally = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    
    const invoice = await Invoice.findById(id)
      .populate('sellerCompanyId', 'name gstin')
      .populate('buyerCompanyId', 'name gstin');
    
    if (!invoice) {
      const error = new Error('Invoice not found');
      error.code = 'INVOICE_NOT_FOUND';
      error.statusCode = 404;
      return next(error);
    }
    
    // Verify buyer access
    if (invoice.buyerCompanyId._id.toString() !== companyId) {
      const error = new Error('Only the buyer company can push this invoice');
      error.code = 'WRONG_COMPANY_ACCESS';
      error.statusCode = 403;
      return next(error);
    }
    
    // Check if already pushed (Requirement 9.6)
    if (invoice.status === 'Pushed_to_Tally') {
      const error = new Error('Invoice has already been pushed to Tally');
      error.code = 'INVOICE_ALREADY_PUSHED';
      error.statusCode = 409;
      return next(error);
    }
    
    // Get buyer's Tally connection
    const tallyConnection = await TallyConnection.findOne({ companyId });
    
    if (!tallyConnection) {
      const error = new Error('Tally connection not configured');
      error.code = 'NO_TALLY_CONFIG';
      return next(error);
    }
    
    // Log push attempt (Requirement 9.4)
    await logPushAttempt(invoice._id, companyId);
    
    // Decrypt credentials
    const credentials = decryptCredentials(tallyConnection.encryptedCredentials);
    
    // Prepare connection config
    const connectionConfig = {
      apiEndpoint: tallyConnection.apiEndpoint,
      credentials
    };
    
    // Get line items
    const lineItems = await InvoiceLineItem.findByInvoice(id);
    
    // Prepare invoice data for push
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      sellerCompanyName: invoice.sellerCompanyId.name,
      sellerGSTIN: invoice.sellerCompanyId.gstin,
      lineItems: lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        taxableAmount: item.taxableAmount,
        taxAmount: item.taxAmount
      })),
      taxableAmount: invoice.taxableAmount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount
    };
    
    // Get appropriate connector
    const integrationMode = process.env.INTEGRATION_MODE || 'mock';
    const connector = integrationMode === 'mock' ? new MockConnector() : new TallyConnector();
    
    // Push invoice (Requirement 9.1)
    const result = await connector.pushInvoice(connectionConfig, invoiceData, tallyConnection.fieldMapping);
    
    if (result.success) {
      // Update status (Requirement 9.2)
      invoice.status = 'Pushed_to_Tally';
      await invoice.save();
      
      // Log success
      await logPushSuccess(invoice._id, companyId, result.referenceId);
      
      res.json({
        success: true,
        data: {
          invoice: {
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status
          },
          tallyReferenceId: result.referenceId
        },
        message: 'Invoice pushed to Tally successfully'
      });
      
    } else {
      // Update status (Requirement 9.3)
      invoice.status = 'Failed';
      await invoice.save();
      
      // Log failure
      await logPushFailure(invoice._id, companyId, result.message);
      
      const error = new Error(result.message || 'Failed to push invoice to Tally');
      error.code = 'TALLY_PUSH_FAILED';
      return next(error);
    }
    
  } catch (error) {
    // Log failure
    await logPushFailure(req.params.id, req.user.companyId, error.message);
    
    // Update invoice status
    const invoice = await Invoice.findById(req.params.id);
    if (invoice) {
      invoice.status = 'Failed';
      await invoice.save();
    }
    
    next(error);
  }
};

/**
 * Update invoice status (buyer action)
 * 
 * PUT /api/invoices/:id/status
 * 
 * Requirement 11.2: Allow buyers to accept/reject invoices
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.user.companyId;
    
    // Validate status
    if (!['Accepted', 'Rejected'].includes(status)) {
      const error = new Error('Status must be Accepted or Rejected');
      error.code = 'INVALID_STATUS';
      return next(error);
    }
    
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      const error = new Error('Invoice not found');
      error.code = 'INVOICE_NOT_FOUND';
      error.statusCode = 404;
      return next(error);
    }
    
    // Verify buyer access
    if (!invoice.buyerCompanyId || invoice.buyerCompanyId.toString() !== companyId) {
      const error = new Error('Only the buyer company can update this invoice status');
      error.code = 'WRONG_COMPANY_ACCESS';
      error.statusCode = 403;
      return next(error);
    }
    
    // Update status (Requirement 11.2, 11.5)
    await invoice.updateStatus(status);
    
    res.json({
      success: true,
      data: {
        invoice: {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          statusChangedAt: invoice.statusChangedAt
        }
      },
      message: `Invoice ${status.toLowerCase()} successfully`
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  importFromTally,
  pushToTally,
  updateStatus
};
