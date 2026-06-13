/**
 * Invoice Context
 * 
 * Manages invoice list state and operations
 * 
 * Requirements: 6.1, 7.1
 */

import { createContext, useContext, useState, useCallback } from 'react';

const InvoiceContext = createContext(null);

export const InvoiceProvider = ({ children }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: null,
    limit: 100,
    skip: 0
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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
    filters,
    selectedInvoice,
    setLoading,
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
