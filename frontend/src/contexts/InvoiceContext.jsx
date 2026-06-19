/**
 * Invoice Context
 * 
 * Manages invoice list state and operations
 * 
 * Requirements: 6.1, 7.1
 */

import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const InvoiceContext = createContext(null);

export const InvoiceProvider = ({ children }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: null,
    limit: 100,
    skip: 0
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  /**
   * Fetch invoices from API
   */
  const fetchInvoices = useCallback(async (filterParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = { ...filters, ...filterParams };
      const response = await api.get('/invoices', { params });
      
      if (response.data.success) {
        setInvoices(response.data.data.invoices);
      }
      
      return response.data.data.invoices;
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch invoices';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Import invoices from Tally
   */
  const importFromTally = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const requestBody = {
        startDate: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        endDate: options.endDate || new Date().toISOString(),
        limit: options.limit || 100
      };
      
      console.log('📤 Importing from Tally with params:', requestBody);
      
      const response = await api.post('/invoices/import-from-tally', requestBody);
      
      console.log('📥 Import response:', response.data);
      
      if (response.data.success) {
        // Refresh invoices list
        await fetchInvoices();
        
        return {
          count: response.data.data.importedCount,
          skipped: response.data.data.skippedCount,
          errors: response.data.data.errorCount
        };
      }
      
      throw new Error(response.data.message || 'Import failed');
    } catch (err) {
      const errorMsg = err.message || 'Failed to import invoices from Tally';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [fetchInvoices]);

  /**
   * Set invoices list
   */
  const updateInvoices = useCallback((newInvoices) => {
    setInvoices(newInvoices);
  }, []);

  /**
   * Add a single invoice to the list
   */
  const addInvoice = useCallback((invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
  }, []);

  /**
   * Update a single invoice in the list
   */
  const updateInvoice = useCallback((invoiceId, updates) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv._id === invoiceId ? { ...inv, ...updates } : inv))
    );
  }, []);

  /**
   * Remove an invoice from the list
   */
  const removeInvoice = useCallback((invoiceId) => {
    setInvoices((prev) => prev.filter((inv) => inv._id !== invoiceId));
  }, []);

  /**
   * Filter invoices by status
   */
  const filterByStatus = useCallback((status) => {
    setFilters((prev) => ({ ...prev, status, skip: 0 }));
  }, []);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setFilters({ status: null, limit: 100, skip: 0 });
  }, []);

  /**
   * Select an invoice for detail view
   */
  const selectInvoice = useCallback((invoice) => {
    setSelectedInvoice(invoice);
  }, []);

  /**
   * Clear selected invoice
   */
  const clearSelectedInvoice = useCallback(() => {
    setSelectedInvoice(null);
  }, []);

  /**
   * Get invoices by status
   */
  const getInvoicesByStatus = useCallback(
    (status) => {
      return invoices.filter((inv) => inv.status === status);
    },
    [invoices]
  );

  /**
   * Get invoice count by status
   */
  const getStatusCount = useCallback(
    (status) => {
      return invoices.filter((inv) => inv.status === status).length;
    },
    [invoices]
  );

  const value = {
    invoices,
    loading,
    error,
    filters,
    selectedInvoice,
    setLoading,
    fetchInvoices,
    importFromTally,
    updateInvoices,
    addInvoice,
    updateInvoice,
    removeInvoice,
    filterByStatus,
    clearFilters,
    selectInvoice,
    clearSelectedInvoice,
    getInvoicesByStatus,
    getStatusCount,
    // Quick stats
    totalCount: invoices.length,
    newCount: getStatusCount('New'),
    acceptedCount: getStatusCount('Accepted'),
    rejectedCount: getStatusCount('Rejected'),
    pushedCount: getStatusCount('Pushed_to_Tally'),
    unmatchedCount: getStatusCount('Unmatched')
  };

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
};

/**
 * Custom hook to use invoice context
 */
export const useInvoices = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoices must be used within InvoiceProvider');
  }
  return context;
};

export default InvoiceContext;
