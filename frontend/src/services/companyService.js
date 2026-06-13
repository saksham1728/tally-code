/**
 * Company Service
 * 
 * Handles company and Tally connection API calls
 * 
 * Requirements: 12.8
 */

import api, { getErrorMessage } from './api';

/**
 * Get current user's company details
 * 
 * @returns {Promise<Object>} { success, company, tallyConnection }
 */
export const getMyCompany = async () => {
  try {
    const response = await api.get('/company/me');

    return {
      success: true,
      company: response.data.data.company,
      tallyConnection: response.data.data.tallyConnection
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
};

/**
 * Update company contact details
 * 
 * @param {Object} updates - Company updates
 * @param {string} updates.email - Company email
 * @param {string} updates.phone - Company phone
 * @returns {Promise<Object>} { success, company }
 */
export const updateCompany = async (updates) => {
  try {
    const response = await api.put('/company/me', updates);

    return {
      success: true,
      company: response.data.data.company,
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
 * Get Tally connection details
 * 
 * @returns {Promise<Object>} { success, tallyConnection }
 */
export const getTallyConnection = async () => {
  try {
    const response = await api.get('/company/tally-connection');

    return {
      success: true,
      tallyConnection: response.data.data.tallyConnection
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
};

/**
 * Configure Tally connection
 * 
 * @param {Object} config - Tally configuration
 * @param {string} config.apiEndpoint - Tally API endpoint (e.g., http://localhost:9000)
 * @param {Object} config.credentials - Tally credentials
 * @param {string} config.credentials.username - Tally username (optional)
 * @param {string} config.credentials.password - Tally password (optional)
 * @param {string} config.credentials.companyName - Tally company name
 * @returns {Promise<Object>} { success, tallyConnection }
 */
export const configureTally = async (config) => {
  try {
    const response = await api.post('/company/tally-connection', config);

    return {
      success: true,
      tallyConnection: response.data.data.tallyConnection,
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
 * Test Tally connection
 * 
 * @returns {Promise<Object>} { success, message }
 */
export const testConnection = async () => {
  try {
    const response = await api.post('/company/test-connection');

    return {
      success: true,
      result: response.data.data.result,
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
  getMyCompany,
  updateCompany,
  getTallyConnection,
  configureTally,
  testConnection
};
