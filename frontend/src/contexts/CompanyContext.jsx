/**
 * Company Context
 * 
 * Manages company profile state and Tally connection
 * 
 * Requirements: 2.4
 */

import { createContext, useContext, useState, useCallback } from 'react';

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [tallyConnection, setTallyConnection] = useState(null);
  const [loading, setLoading] = useState(false);

  /**
   * Update company data
   */
  const updateCompany = useCallback((companyData) => {
    setCompany(companyData);
  }, []);

  /**
   * Update specific company fields
   */
  const updateCompanyFields = useCallback((updates) => {
    setCompany((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  /**
   * Update Tally connection data
   */
  const updateTallyConnection = useCallback((connectionData) => {
    setTallyConnection(connectionData);
  }, []);

  /**
   * Update Tally connection status
   */
  const updateConnectionStatus = useCallback((status, lastError = null) => {
    setTallyConnection((prev) =>
      prev
        ? {
            ...prev,
            connectionStatus: status,
            lastTestedAt: new Date().toISOString(),
            lastError
          }
        : null
    );
  }, []);

  /**
   * Clear company data
   */
  const clearCompany = useCallback(() => {
    setCompany(null);
    setTallyConnection(null);
  }, []);

  /**
   * Check if Tally is connected
   */
  const isTallyConnected = useCallback(() => {
    return tallyConnection?.connectionStatus === 'connected';
  }, [tallyConnection]);

  /**
   * Check if Tally is configured
   */
  const isTallyConfigured = useCallback(() => {
    return !!tallyConnection?.apiEndpoint;
  }, [tallyConnection]);

  const value = {
    company,
    tallyConnection,
    loading,
    setLoading,
    updateCompany,
    updateCompanyFields,
    updateTallyConnection,
    updateConnectionStatus,
    clearCompany,
    isTallyConnected,
    isTallyConfigured,
    // Quick access to company properties
    companyName: company?.name,
    gstin: company?.gstin,
    companyType: company?.companyType,
    tallyStatus: tallyConnection?.connectionStatus || 'disconnected',
    tallyEndpoint: tallyConnection?.apiEndpoint
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

/**
 * Custom hook to use company context
 */
export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};

export default CompanyContext;
