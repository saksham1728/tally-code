/**
 * Invoice Service
 * 
 * Handles invoice-related API calls
 * 
 * Requirements: 12.3, 12.4, 12.5, 12.6
 */

import api, { getErrorMessage } from './api';

/**
 * Get invoices with optional filters
 * 
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by status
 * @param {number} filters.limit - Limit number of results
 * @param {number} filters.skip - Skip number of results
 * @returns {Promise<Object>} { success, invoices, count }
 */
export const getInvoices = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.skip) params.append('skip', filters.skip);

    const response = await api.get(`/invoices?${params.toString()}`);

    return {
      success: true,
      invoices: response.data.data.invoices,
      count: response.data.data.count
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      invoices: [],
      count: 0
    };
  }
};

/**
 * Get invoice by ID with line items
 * 
 * @param {string} id - Invoice ID
 * @returns {Promise<Object>} { success, invoice, lineItems }
 */
export const getInvoiceById = async (id) => {
  try {
    const response = await api.get(`/invoices/${id}`);

    return {
      success: true,
      invoice: response.data.data.invoice,
      lineItems: response.data.data.lineItems
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
};

/**
 * Import invoices from Tally
 * 
 * @param {Object} options - Import options
 * @param {string} options.startDate - Start date (optional)
 * @param {string} options.endDate - End date (optional)
 * @param {number} options.limit - Limit number of invoices (optional)
 * @returns {Promise<Object>} { success, imported, skipped, errors }
 */
export const importFromTally = async (options = {}) => {
  try {
    const response = await api.post('/invoices/import-from-tally', options);

    return {
      success: true,
      imported: response.data.data.imported,
      importedCount: response.data.data.importedCount,
      skipped: response.data.data.skipped,
      skippedCount: response.data.data.skippedCount,
      errors: response.data.data.errors || []
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
};

/**
 * Push invoice to Tally (buyer action)
 * 
 * @param {string} id - Invoice ID
 * @returns {Promise<Object>} { success, invoice, tallyReferenceId }
 */
export const pushToTally = async (id) => {
  try {
    const response = await api.post(`/invoices/${id}/push-to-tally`);

    return {
      success: true,
      invoice: response.data.data.invoice,
      tallyReferenceId: response.data.data.tallyReferenceId,
      message: response.data.message
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
};

/**
 * Update invoice status (Accept/Reject)
 * 
 * @param {string} id - Invoice ID
 * @param {string} status - New status (Accepted/Rejected)
 * @returns {Promise<Object>} { success, invoice }
 */
export const updateStatus = async (id, status) => {
  try {
    const response = await api.put(`/invoices/${id}/status`, { status });

    return {
      success: true,
      invoice: response.data.data.invoice,
      message: response.data.message
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
};

export default {
  getInvoices,
  getInvoiceById,
  importFromTally,
  pushToTally,
  updateStatus
};
