/**
 * Company Profile Component
 * 
 * Display and edit company profile information
 * 
 * Requirements: 2.4, 3.4
 */

import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Notification from '../common/Notification';
import './CompanyProfile.css';

const CompanyProfile = () => {
  const { company, loading, error, fetchCompany, updateCompanyDetails } = useCompany();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: ''
  });
  const [notification, setNotification] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, []);

  useEffect(() => {
    if (company) {
      setFormData({
        email: company.email || '',
        phone: company.phone || ''
      });
    }
  }, [company]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      email: company?.email || '',
      phone: company?.phone || ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      await updateCompanyDetails(formData);
      setIsEditing(false);
      setNotification({
        type: 'success',
        message: 'Company profile updated successfully!'
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update company profile'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTallyConnectionStatus = () => {
    if (!company?.tallyConnection) {
      return { text: 'Not Configured', color: 'gray', icon: '⚪' };
    }

    switch (company.tallyConnection.connectionStatus) {
      case 'connected':
        return { text: 'Connected', color: 'green', icon: '🟢' };
      case 'disconnected':
        return { text: 'Disconnected', color: 'red', icon: '🔴' };
      case 'error':
        return { text: 'Error', color: 'orange', icon: '🟠' };
      default:
        return { text: 'Unknown', color: 'gray', icon: '⚪' };
    }
  };

  if (loading) {
    return (
      <div className="company-profile-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="company-profile-container">
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="company-profile-container">
        <div className="error-message">
          <p>No company information available</p>
        </div>
      </div>
    );
  }

  const statusInfo = getTallyConnectionStatus();

  return (
    <div className="company-profile-container">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="company-profile-card">
        <div className="profile-header">
          <h2>Company Profile</h2>
          {!isEditing && (
            <button className="btn btn-primary" onClick={handleEdit}>
              ✏️ Edit Profile
            </button>
          )}
        </div>

        <form onSubmit={handleSave}>
          {/* Read-only Company Information */}
          <div className="profile-section">
            <h3>Company Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Company Name</label>
                <div className="info-value">{company.name}</div>
              </div>

              <div className="info-item">
                <label>GSTIN</label>
                <div className="info-value">{company.gstin}</div>
              </div>

              <div className="info-item">
                <label>Company Type</label>
                <div className="info-value">
                  <span className={`type-badge type-${company.companyType}`}>
                    {company.companyType === 'seller' ? '🏭 Seller' : '🛒 Buyer'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Contact Information */}
          <div className="profile-section">
            <h3>Contact Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                ) : (
                  <div className="info-value">{company.email || 'Not set'}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                ) : (
                  <div className="info-value">{company.phone || 'Not set'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Tally Connection Status */}
          <div className="profile-section">
            <h3>Tally Integration</h3>
            <div className="connection-status-box">
              <div className="status-indicator">
                <span className="status-icon">{statusInfo.icon}</span>
                <span className={`status-text status-${statusInfo.color}`}>
                  {statusInfo.text}
                </span>
              </div>

              {company.tallyConnection && (
                <div className="connection-details">
                  <div className="detail-row">
                    <span className="detail-label">API Endpoint:</span>
                    <span className="detail-value">{company.tallyConnection.apiEndpoint}</span>
                  </div>
                  {company.tallyConnection.lastTestedAt && (
                    <div className="detail-row">
                      <span className="detail-label">Last Tested:</span>
                      <span className="detail-value">
                        {new Date(company.tallyConnection.lastTestedAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {company.tallyConnection.lastError && (
                    <div className="detail-row error-row">
                      <span className="detail-label">Last Error:</span>
                      <span className="detail-value">{company.tallyConnection.lastError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>

        {/* Metadata */}
        <div className="profile-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Created:</span>
            <span className="metadata-value">
              {new Date(company.createdAt).toLocaleDateString('en-IN')}
            </span>
          </div>
          {company.updatedAt && (
            <div className="metadata-item">
              <span className="metadata-label">Last Updated:</span>
              <span className="metadata-value">
                {new Date(company.updatedAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
