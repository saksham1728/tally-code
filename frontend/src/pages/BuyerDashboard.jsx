/**
 * Buyer Dashboard Page
 * 
 * Dashboard for buyers to view, accept/reject, and push invoices to Tally
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 9.5, 9.6
 */

import { useState, useEffect } from 'react';
import { useInvoices } from '../contexts/InvoiceContext';
import InvoiceTable from '../components/invoice/InvoiceTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import './BuyerDashboard.css';

const BuyerDashboard = () => {
  const { invoices, loading, error, fetchInvoices, pushToTally, updateInvoiceStatus } = useInvoices();
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    accepted: 0,
    rejected: 0,
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
    const newInv = invoices.filter(inv => inv.status === 'New').length;
    const accepted = invoices.filter(inv => inv.status === 'Accepted').length;
    const rejected = invoices.filter(inv => inv.status === 'Rejected').length;
    const pushed = invoices.filter(inv => inv.status === 'Pushed_to_Tally').length;

    setStats({ total, new: newInv, accepted, rejected, pushed });
  };

  const handlePushToTally = async (invoiceId) => {
    try {
      setNotification(null);
      
      const startTime = Date.now();
      await pushToTally(invoiceId);
      const responseTime = Date.now() - startTime;

      setNotification({
        type: 'success',
        message: `✓ Invoice pushed to Tally successfully! (${responseTime}ms)`
      });

      // Reload invoices to show updated status
      await loadInvoices();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to push invoice to Tally'
      });
    }
  };

  const handleUpdateStatus = async (invoiceId, status) => {
    try {
      setNotification(null);

      await updateInvoiceStatus(invoiceId, status);

      setNotification({
        type: 'success',
        message: `✓ Invoice ${status.toLowerCase()} successfully!`
      });

      // Reload invoices to show updated status
      await loadInvoices();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update invoice status'
      });
    }
  };

  return (
    <div className="buyer-dashboard">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="dashboard-header">
        <div className="header-content">
          <h1>🛒 Buyer Dashboard</h1>
          <p>Review and manage your incoming invoices</p>
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

        <div className="stat-card stat-new">
          <div className="stat-icon">🆕</div>
          <div className="stat-content">
            <div className="stat-label">New Invoices</div>
            <div className="stat-value">{stats.new}</div>
          </div>
        </div>

        <div className="stat-card stat-accepted">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-label">Accepted</div>
            <div className="stat-value">{stats.accepted}</div>
          </div>
        </div>

        <div className="stat-card stat-rejected">
          <div className="stat-icon">✕</div>
          <div className="stat-content">
            <div className="stat-label">Rejected</div>
            <div className="stat-value">{stats.rejected}</div>
          </div>
        </div>

        <div className="stat-card stat-pushed">
          <div className="stat-icon">📤</div>
          <div className="stat-content">
            <div className="stat-label">Pushed to Tally</div>
            <div className="stat-value">{stats.pushed}</div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="dashboard-content">
        <div className="content-header">
          <h2>Matched Invoices</h2>
          {stats.new > 0 && (
            <div className="new-alert">
              🆕 {stats.new} new invoice(s) awaiting your review
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
            userRole="buyer_admin"
            onPushToTally={handlePushToTally}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </div>

      {/* Help Section */}
      <div className="help-section">
        <h3>📚 How to use this dashboard</h3>
        <ol>
          <li><strong>Review invoices:</strong> Check new invoices shared by sellers</li>
          <li><strong>Accept or Reject:</strong> Mark invoices as accepted or rejected based on your review</li>
          <li><strong>Push to Tally:</strong> Click the "Push" button to import accepted invoices into your Tally system</li>
          <li><strong>Track status:</strong> Monitor the status of all your invoices in one place</li>
        </ol>
      </div>
    </div>
  );
};

export default BuyerDashboard;
