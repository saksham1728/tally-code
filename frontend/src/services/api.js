/**
 * API Service Utility
 * 
 * Configures axios instance with base URL and JWT token interceptor.
 * Handles authentication and error responses.
 * 
 * Requirements: 12.9, 17.4
 */

import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request Interceptor
 * Automatically attach JWT token to all requests
 */
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handle common response patterns and errors
 */
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('[API Network Error]', error.message);
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR'
      });
    }
    
    const { status, data } = error.response;
    
    // Handle 401 Unauthorized - Token expired or invalid
    if (status === 401) {
      console.warn('[API 401] Unauthorized - Redirecting to login');
      
      // Clear auth data
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      
      // Redirect to login (only if not already on login page)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      return Promise.reject({
        message: 'Session expired. Please login again.',
        code: 'UNAUTHORIZED',
        status: 401
      });
    }
    
    // Handle 403 Forbidden - Insufficient permissions
    if (status === 403) {
      return Promise.reject({
        message: data?.error?.message || 'You do not have permission to perform this action.',
        code: data?.error?.code || 'FORBIDDEN',
        status: 403
      });
    }
    
    // Handle 404 Not Found
    if (status === 404) {
      return Promise.reject({
        message: data?.error?.message || 'Resource not found.',
        code: data?.error?.code || 'NOT_FOUND',
        status: 404
      });
    }
    
    // Handle 409 Conflict (duplicate, already exists, etc.)
    if (status === 409) {
      return Promise.reject({
        message: data?.error?.message || 'Conflict with existing data.',
        code: data?.error?.code || 'CONFLICT',
        status: 409
      });
    }
    
    // Handle 500 Internal Server Error
    if (status >= 500) {
      return Promise.reject({
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status: status
      });
    }
    
    // Handle other errors
    return Promise.reject({
      message: data?.error?.message || 'An error occurred.',
      code: data?.error?.code || 'ERROR',
      details: data?.error?.details,
      status: status
    });
  }
);

/**
 * Helper function to handle API errors consistently
 * 
 * @param {Error} error - Error object from axios
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred.';
};

/**
 * Helper to check if user is authenticated
 * 
 * @returns {boolean} True if user has valid token
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('authToken');
  return !!token;
};

/**
 * Helper to get current user from localStorage
 * 
 * @returns {Object|null} User object or null
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('authUser');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Helper to save auth data
 * 
 * @param {string} token - JWT token
 * @param {Object} user - User object
 */
export const saveAuthData = (token, user) => {
  console.log('💾 Saving auth data:', { token: token.substring(0, 20) + '...', user: user.email });
  localStorage.setItem('authToken', token);
  localStorage.setItem('authUser', JSON.stringify(user));
};

/**
 * Helper to clear auth data
 */
export const clearAuthData = () => {
  console.log('🗑️ Clearing auth data');
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
};

export default api;
