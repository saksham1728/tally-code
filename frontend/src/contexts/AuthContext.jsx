/**
 * Authentication Context
 * 
 * Manages authentication state (user, token, role, companyId)
 * Provides login, logout, and register methods
 * 
 * Requirements: 1.4
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { saveAuthData, clearAuthData, getCurrentUser, isAuthenticated } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      console.log('🔄 Initializing auth from localStorage...');
      
      const token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('authUser');
      
      console.log('📦 Token:', token ? 'exists' : 'missing');
      console.log('📦 User:', userStr ? 'exists' : 'missing');
      
      if (token && userStr) {
        try {
          const userData = JSON.parse(userStr);
          console.log('✅ Auth restored:', userData.email);
          setUser(userData);
          setIsAuth(true);
        } catch (error) {
          console.error('❌ Failed to parse user data:', error);
          clearAuthData();
        }
      } else {
        console.log('❌ No auth data found');
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Login user
   * @param {string} token - JWT token
   * @param {Object} userData - User data (id, email, role, companyId)
   */
  const login = (token, userData) => {
    saveAuthData(token, userData);
    setUser(userData);
    setIsAuth(true);
  };

  /**
   * Logout user
   */
  const logout = () => {
    clearAuthData();
    setUser(null);
    setIsAuth(false);
  };

  /**
   * Update user data
   * @param {Object} updates - Partial user data to update
   */
  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    saveAuthData(localStorage.getItem('authToken'), updatedUser);
  };

  const value = {
    user,
    isAuthenticated: isAuth,
    loading,
    login,
    logout,
    updateUser,
    // Quick access to user properties
    role: user?.role,
    companyId: user?.companyId,
    email: user?.email
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
