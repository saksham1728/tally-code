/**
 * Authentication Service
 * 
 * Handles user authentication API calls
 * 
 * Requirements: 12.1, 12.2
 */

import api, { getErrorMessage } from './api';

/**
 * Login user
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} { success, token, user }
 */
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    return {
      success: true,
      token: response.data.data.token,
      user: response.data.data.user
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
};

/**
 * Register new user and company
 * 
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.companyName - Company name
 * @param {string} userData.gstin - Company GSTIN
 * @param {string} userData.phone - Company phone
 * @param {string} userData.companyType - Company type (seller/buyer/both)
 * @returns {Promise<Object>} { success, token, user }
 */
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);

    return {
      success: true,
      token: response.data.data.token,
      user: response.data.data.user
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
};

/**
 * Get current authenticated user
 * 
 * @returns {Promise<Object>} { success, user }
 */
export const getMe = async () => {
  try {
    const response = await api.get('/auth/me');

    return {
      success: true,
      user: response.data.data.user
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
};

export default {
  login,
  register,
  getMe
};
