/**
 * Auth Manager Module
 * 
 * Handles user authentication, JWT token management
 * Stores credentials securely in OS keychain
 */

const keytar = require('keytar');
const axios = require('axios');

class AuthManager {
  constructor(apiEndpoint, logger) {
    this.apiEndpoint = apiEndpoint.replace('ws://', 'http://').replace('wss://', 'https://');
    this.logger = logger;
    this.serviceName = 'tally-bridge';
    this.currentUser = null;
    this.token = null;
    
    // Try to load saved credentials on init
    this.loadSavedCredentials();
  }
  
  /**
   * Load saved credentials from keychain
   */
  async loadSavedCredentials() {
    try {
      const credentials = await keytar.findCredentials(this.serviceName);
      if (credentials && credentials.length > 0) {
        const { account, password } = credentials[0];
        this.currentUser = account;
        this.token = password;
        this.logger.info('Loaded saved credentials', { email: account });
      }
    } catch (error) {
      this.logger.error('Failed to load saved credentials', { error: error.message });
    }
  }
  
  /**
   * Login user
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} { success, token, user, error }
   */
  async login(email, password) {
    try {
      this.logger.info('Attempting login', { email });
      
      const response = await axios.post(`${this.apiEndpoint}/api/auth/login`, {
        email,
        password
      }, {
        timeout: 10000
      });
      
      // Backend returns { success: true, data: { token, user, company } }
      if (response.data && response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        
        // Store in keychain
        await keytar.setPassword(this.serviceName, email, token);
        
        // Store in memory
        this.currentUser = email;
        this.token = token;
        
        this.logger.info('Login successful', { 
          email, 
          role: user.role,
          company: user.companyId 
        });
        
        return { 
          success: true, 
          token, 
          user 
        };
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      this.logger.error('Login failed', { 
        email, 
        error: error.message,
        status: error.response?.status
      });
      
      let errorMessage = 'Login failed';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (error.response.status === 404) {
          errorMessage = 'User not found';
        } else {
          errorMessage = error.response.data?.message || 'Server error';
        }
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server. Please check if backend is running.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout. Please check your internet connection.';
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }
  
  /**
   * Logout user
   */
  async logout() {
    try {
      if (this.currentUser) {
        // Remove from keychain
        await keytar.deletePassword(this.serviceName, this.currentUser);
        
        this.logger.info('Logout successful', { email: this.currentUser });
        
        // Clear memory
        this.currentUser = null;
        this.token = null;
      }
      
      return { success: true };
      
    } catch (error) {
      this.logger.error('Logout failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get stored token
   * @returns {string|null}
   */
  getToken() {
    return this.token;
  }
  
  /**
   * Get current user email
   * @returns {string|null}
   */
  getCurrentUser() {
    return this.currentUser;
  }
  
  /**
   * Check if user is logged in
   * @returns {boolean}
   */
  isLoggedIn() {
    return this.token !== null && this.currentUser !== null;
  }
  
  /**
   * Refresh token
   * @returns {Promise<Object>}
   */
  async refreshToken() {
    try {
      if (!this.token) {
        throw new Error('No token to refresh');
      }
      
      this.logger.info('Refreshing token');
      
      const response = await axios.post(`${this.apiEndpoint}/api/auth/refresh`, {}, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        timeout: 10000
      });
      
      if (response.data && response.data.token) {
        const newToken = response.data.token;
        
        // Update keychain
        if (this.currentUser) {
          await keytar.setPassword(this.serviceName, this.currentUser, newToken);
        }
        
        // Update memory
        this.token = newToken;
        
        this.logger.info('Token refreshed successfully');
        
        return { success: true, token: newToken };
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      this.logger.error('Token refresh failed', { error: error.message });
      
      // If refresh fails, user needs to login again
      this.currentUser = null;
      this.token = null;
      
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get authorization header
   * @returns {Object}
   */
  getAuthHeaders() {
    if (!this.token) {
      return {};
    }
    
    return {
      'Authorization': `Bearer ${this.token}`
    };
  }
  
  /**
   * Validate token (check if still valid)
   * @returns {Promise<boolean>}
   */
  async validateToken() {
    try {
      if (!this.token) {
        return false;
      }
      
      const response = await axios.get(`${this.apiEndpoint}/api/auth/me`, {
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      
      return response.status === 200;
      
    } catch (error) {
      this.logger.warn('Token validation failed', { error: error.message });
      return false;
    }
  }
}

module.exports = AuthManager;
