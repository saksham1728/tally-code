/**
 * Seller Dashboard Page
 * 
 * Dashboard for sellers to import and view invoices
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { useState, useEffect } from 'react';
import { useInvoices } from '../contexts/InvoiceContext';
import InvoiceTable from '../components/invoice/InvoiceTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import './SellerDashboard.css';

const SellerDashboard = () => {
  const { invoices, loading, error, fetchInvoices, importFromTally } = useInvoices();
  const [notification, setNotification] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    matched: 0,
    unmatched: 0,
    pushed: 0
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    if (invoices) {
      calculateStats();
    }
  }, [invoices]);

  const loadInvoices = async () => {
    try {
      await fetchInvoices();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load invoices'
      });
    }
  };

  const calculateStats = () => {
    const total = invoices.length;
    const matched = invoices.filter(inv => inv.buyerCompanyId).length;
    const unmatched = invoices.filter(inv => inv.status === 'Unmatched').length;
    const pushed = invoices.filter(inv => inv.status === 'Pushed_to_Tally').length;

    setStats({ total, matched, unmatched, pushed });
  };

  const handleImportFromTally = async () => {
    try {
      setIsImporting(true);
      setNotification(null);

      const result = await importFromTally();

      setNotification({
        type: 'success',
        message: `✓ Successfully imported ${result.count || 0} invoice(s) from Tally`
      });

      // Reload invoices to show new data
      await loadInvoices();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to import invoices from Tally'
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="seller-dashboard">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="dashboard-header">
        <div className="header-content">
          <h1>📊 Seller Dashboard</h1>
          <p>Manage and track your invoice exports</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary btn-import"
            onClick={handleImportFromTally}
            disabled={isImporting || loading}
          >
            {isImporting ? (
              <>
                <LoadingSpinner size="small" />
                Importing...
              </>
            ) : (
              <>
                📥 Import from Tally
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">📄</div>
          <div className="stat-content">
            <div className="stat-label">Total Invoices</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>

        <div className="stat-card stat-matched">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-label">Matched</div>
            <div className="stat-value">{stats.matched}</div>
          </div>
        </div>

        <div className="stat-card stat-unmatched">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-label">Unmatched</div>
            <div className="stat-value">{stats.unmatched}</div>
          </div>
        </div>

        <div className="stat-card stat-pushed">
          <div className="stat-icon">📤</div>
          <div className="stat-content">
            <div className="stat-label">Pushed to Buyer</div>
            <div className="stat-value">{stats.pushed}</div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="dashboard-content">
        <div className="content-header">
          <h2>All Invoices</h2>
          {stats.unmatched > 0 && (
            <div className="unmatched-alert">
              ⚠️ {stats.unmatched} invoice(s) could not be matched with buyers
            </div>
          )}
        </div>

        {loading && !invoices ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Loading invoices...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>❌ {error}</p>
            <button className="btn btn-secondary" onClick={loadInvoices}>
              Retry
            </button>
          </div>
        ) : (
          <InvoiceTable
            invoices={invoices}
            userRole="seller_admin"
            onPushToTally={null}
            onUpdateStatus={null}
          />
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;
