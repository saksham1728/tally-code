/**
 * Matching Service
 * 
 * Handles buyer company matching logic for imported invoices.
 * Tries GSTIN match first, then falls back to company name matching.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

const Company = require('../models/Company');
const Invoice = require('../models/Invoice');
const { createLog } = require('./syncLog.service');

/**
 * Match buyer company for an invoice
 * 
 * Requirements:
 * - 5.1: Try GSTIN matching first
 * - 5.2: Fall back to company name matching
 * - 5.3: Mark as "Unmatched" if both fail
 * - 5.4: Update invoice with matched buyer company ID
 * - 5.5: Use case-insensitive comparison for company name
 * 
 * @param {string} invoiceId - Invoice ID to match
 * @returns {Promise<Object>} Match result with success flag and matched company
 */
async function matchBuyerForInvoice(invoiceId) {
  try {
    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    
    // Log match attempt
    await createLog({
      eventType: 'buyer_match_attempt',
      invoiceId: invoice._id,
      companyId: invoice.sellerCompanyId,
      status: 'started',
      metadata: {
        buyerGSTIN: invoice.buyerGSTIN,
        buyerCompanyName: invoice.buyerCompanyName
      }
    });
    
    let matchedCompany = null;
    let matchMethod = null;
    
    // Try GSTIN match first (Requirement 5.1)
    if (invoice.buyerGSTIN) {
      matchedCompany = await matchByGSTIN(invoice.buyerGSTIN);
      if (matchedCompany) {
        matchMethod = 'GSTIN';
      }
    }
    
    // Fall back to company name match (Requirement 5.2)
    if (!matchedCompany && invoice.buyerCompanyName) {
      matchedCompany = await matchByCompanyName(invoice.buyerCompanyName);
      if (matchedCompany) {
        matchMethod = 'CompanyName';
      }
    }
    
    // Update invoice based on match result
    if (matchedCompany) {
      // Successful match (Requirement 5.4)
      invoice.buyerCompanyId = matchedCompany._id;
      invoice.status = 'New';
      await invoice.save();
      
      // Log successful match
      await createLog({
        eventType: 'buyer_match_success',
        invoiceId: invoice._id,
        companyId: matchedCompany._id,
        status: 'success',
        metadata: {
          matchMethod,
          buyerCompanyName: matchedCompany.name,
          buyerGSTIN: matchedCompany.gstin
        }
      });
      
      // Log invoice shared to buyer
      await createLog({
        eventType: 'invoice_shared_to_buyer',
        invoiceId: invoice._id,
        companyId: matchedCompany._id,
        status: 'success'
      });
      
      return {
        success: true,
        matched: true,
        matchMethod,
        company: {
          _id: matchedCompany._id,
          name: matchedCompany.name,
          gstin: matchedCompany.gstin
        }
      };
    } else {
      // No match found (Requirement 5.3)
      invoice.status = 'Unmatched';
      await invoice.save();
      
      // Log failed match
      await createLog({
        eventType: 'buyer_match_failed',
        invoiceId: invoice._id,
        companyId: invoice.sellerCompanyId,
        status: 'failed',
        errorMessage: 'No matching buyer company found',
        metadata: {
          buyerGSTIN: invoice.buyerGSTIN,
          buyerCompanyName: invoice.buyerCompanyName
        }
      });
      
      return {
        success: true,
        matched: false,
        matchMethod: null,
        company: null
      };
    }
    
  } catch (error) {
    console.error('Error in matchBuyerForInvoice:', error);
    
    // Log error
    await createLog({
      eventType: 'buyer_match_failed',
      invoiceId,
      status: 'error',
      errorMessage: error.message
    });
    
    throw error;
  }
}

/**
 * Match company by GSTIN (Requirement 5.1)
 * 
 * @param {string} gstin - GSTIN to search for
 * @returns {Promise<Company|null>} Matched company or null
 */
async function matchByGSTIN(gstin) {
  if (!gstin) {
    return null;
  }
  
  try {
    // Use the static method from Company model
    const company = await Company.findByGSTIN(gstin);
    return company;
  } catch (error) {
    console.error('Error in matchByGSTIN:', error);
    return null;
  }
}

/**
 * Match company by name (case-insensitive) (Requirements 5.2, 5.5)
 * 
 * @param {string} companyName - Company name to search for
 * @returns {Promise<Company|null>} Matched company or null
 */
async function matchByCompanyName(companyName) {
  if (!companyName) {
    return null;
  }
  
  try {
    // Use the static method from Company model (case-insensitive)
    const company = await Company.findByName(companyName);
    return company;
  } catch (error) {
    console.error('Error in matchByCompanyName:', error);
    return null;
  }
}

/**
 * Manually trigger buyer matching for an unmatched invoice
 * Used by super admin to retry matching
 * 
 * @param {string} invoiceId - Invoice ID to re-match
 * @returns {Promise<Object>} Match result
 */
async function retryMatching(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  
  if (!invoice) {
    throw new Error('Invoice not found');
  }
  
  if (invoice.buyerCompanyId) {
    return {
      success: false,
      message: 'Invoice is already matched with a buyer company'
    };
  }
  
  // Attempt matching again
  const result = await matchBuyerForInvoice(invoiceId);
  
  return {
    success: true,
    ...result
  };
}

/**
 * Get all unmatched invoices
 * 
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of unmatched invoices
 */
async function getUnmatchedInvoices(options = {}) {
  return await Invoice.findUnmatched(options);
}

module.exports = {
  matchBuyerForInvoice,
  matchByGSTIN,
  matchByCompanyName,
  retryMatching,
  getUnmatchedInvoices
};
