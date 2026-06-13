/**
 * Super Admin Panel Page
 * 
 * Admin dashboard for system-wide monitoring and management
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { useState, useEffect } from 'react';
import companyService from '../services/companyService';
import invoiceService from '../services/invoiceService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import './SuperAdminPanel.css';

const SuperAdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load system stats and companies
      // Note: These endpoints would need to be added to the admin controller
      // For MVP, we'll simulate with basic data
      const invoicesData = await invoiceService.getInvoices({});
      const companiesData = await companyService.getMyCompany(); // Placeholder

      // Calculate basic stats
      const totalInvoices = invoicesData.length;
      const pushedInvoices = invoicesData.filter(inv => inv.status === 'Pushed_to_Tally').length;
      const successRate = totalInvoices > 0 ? ((pushedInvoices / totalInvoices) * 100).toFixed(1) : 0;

      setStats({
        totalInvoices,
        activeCompanies: 1, // Placeholder
        syncSuccessRate: successRate,
        pendingMatches: invoicesData.filter(inv => inv.status === 'Unmatched').length
      });

      setCompanies([companiesData]); // Placeholder - would need admin endpoint
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load admin data'
      });
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'disconnected':
        return 'red';
      case 'error':
        return 'orange';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="super-admin-panel">
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="super-admin-panel">
        <div className="error-container">
          <p>❌ {error}</p>
          <button className="btn btn-secondary" onClick={loadAdminData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="super-admin-panel">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="page-header">
        <h1>⚙️ Super Admin Panel</h1>
        <p>System-wide monitoring and management</p>
      </div>

      {/* System Stats */}
      <div className="stats-section">
        <h2>System Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-content">
              <div className="stat-label">Total Invoices</div>
              <div className="stat-value">{stats?.totalInvoices || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div className="stat-content">
              <div className="stat-label">Active Companies</div>
              <div className="stat-value">{stats?.activeCompanies || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <div className="stat-label">Sync Success Rate</div>
              <div className="stat-value">{stats?.syncSuccessRate || 0}%</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-label">Pending Matches</div>
              <div className="stat-value">{stats?.pendingMatches || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="companies-section">
        <h2>Registered Companies</h2>
        <div className="companies-table-container">
          <table className="companies-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>GSTIN</th>
                <th>Type</th>
                <th>Email</th>
                <th>Tally Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company._id}>
                  <td className="company-name">{company.name}</td>
                  <td>{company.gstin}</td>
                  <td>
                    <span className={`type-badge type-${company.companyType}`}>
                      {company.companyType === 'seller' ? '🏭 Seller' : '🛒 Buyer'}
                    </span>
                  </td>
                  <td>{company.email || 'N/A'}</td>
                  <td>
                    <span className={`status-dot status-${getConnectionStatusColor(company.tallyConnection?.connectionStatus)}`}>
                      ●
                    </span>
                    {company.tallyConnection?.connectionStatus || 'Not configured'}
                  </td>
                  <td>{new Date(company.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Note */}
      <div className="admin-note">
        <h3>📝 Admin Note</h3>
        <p>
          This is the Super Admin panel for system-wide monitoring. Additional features like manual
          invoice matching, bulk operations, and detailed analytics will be available in future releases.
        </p>
      </div>
    </div>
  );
};

export default SuperAdminPanel;
