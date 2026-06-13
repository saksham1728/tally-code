/**
 * Log Service
 * 
 * Handles sync log API calls
 * 
 * Requirements: 12.7
 */

import api, { getErrorMessage } from './api';

/**
 * Get sync logs with filters
 * 
 * @param {Object} filters - Filter options
 * @param {string} filters.invoiceId - Filter by invoice ID
 * @param {string} filters.eventType - Filter by event type
 * @param {string} filters.startDate - Start date
 * @param {string} filters.endDate - End date
 * @param {number} filters.limit - Limit number of results
 * @returns {Promise<Object>} { success, logs, count }
 */
export const getLogs = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.invoiceId) params.append('invoiceId', filters.invoiceId);
    if (filters.eventType) params.append('eventType', filters.eventType);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/logs?${params.toString()}`);

    return {
      success: true,
      logs: response.data.data.logs,
      count: response.data.data.count
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      logs: [],
      count: 0
    };
  }
};

/**
 * Get logs for a specific invoice
 * 
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} { success, logs }
 */
export const getInvoiceLogs = async (invoiceId) => {
  try {
    const response = await api.get(`/logs/invoice/${invoiceId}`);

    return {
      success: true,
      logs: response.data.data.logs
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      logs: []
    };
  }
};

/**
 * Get logs for current user's company
 * 
 * @returns {Promise<Object>} { success, logs }
 */
export const getMyCompanyLogs = async () => {
  try {
    const response = await api.get('/logs/my-company');

    return {
      success: true,
      logs: response.data.data.logs
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      logs: []
    };
  }
};

export default {
  getLogs,
  getInvoiceLogs,
  getMyCompanyLogs
};
