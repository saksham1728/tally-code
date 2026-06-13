/**
 * Tally Connection Form Component
 * 
 * Configure and test Tally API connection
 * 
 * Requirements: 3.1, 3.3
 */

import { useState } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import LoadingSpinner from '../common/LoadingSpinner';
import Notification from '../common/Notification';
import './TallyConnectionForm.css';

const TallyConnectionForm = () => {
  const { company, configureTallyConnection, testTallyConnection } = useCompany();
  
  const [formData, setFormData] = useState({
    apiEndpoint: company?.tallyConnection?.apiEndpoint || 'http://localhost:9000',
    username: '',
    password: ''
  });

  const [notification, setNotification] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear test result when form changes
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setNotification(null);

      const result = await testTallyConnection();
      
      setTestResult({
        success: true,
        message: result.message || 'Connection successful!',
        responseTime: result.responseTime
      });

      setNotification({
        type: 'success',
        message: '✓ Tally connection successful!'
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Connection failed'
      });

      setNotification({
        type: 'error',
        message: err.message || 'Failed to connect to Tally'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.apiEndpoint) {
      setNotification({
        type: 'error',
        message: 'API Endpoint is required'
      });
      return;
    }

    try {
      setIsSaving(true);
      setNotification(null);

      const payload = {
        apiEndpoint: formData.apiEndpoint
      };

      // Only include credentials if provided
      if (formData.username || formData.password) {
        payload.credentials = {
          username: formData.username,
          password: formData.password
        };
      }

      await configureTallyConnection(payload);

      setNotification({
        type: 'success',
        message: 'Tally connection configured successfully!'
      });

      // Clear password fields after successful save
      setFormData(prev => ({
        ...prev,
        username: '',
        password: ''
      }));

      setTestResult(null);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to configure Tally connection'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="tally-connection-form-container">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="tally-connection-card">
        <div className="connection-header">
          <h2>Tally Integration Setup</h2>
          <p className="connection-description">
            Configure your Tally API connection to enable invoice synchronization
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Connection Settings</h3>

            <div className="form-group">
              <label htmlFor="apiEndpoint">
                Tally API Endpoint <span className="required">*</span>
              </label>
              <input
                type="url"
                id="apiEndpoint"
                name="apiEndpoint"
                value={formData.apiEndpoint}
                onChange={handleInputChange}
                className="form-control"
                placeholder="http://localhost:9000"
                required
              />
              <small className="form-hint">
                Default: http://localhost:9000 (Tally running on same computer)
              </small>
            </div>

            <div className="credentials-section">
              <h4>Authentication (Optional)</h4>
              <p className="credentials-info">
                Leave blank if your Tally installation doesn't require authentication
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Enter Tally username"
                    autoComplete="off"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Enter Tally password"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div className={`test-result ${testResult.success ? 'test-success' : 'test-error'}`}>
              <div className="test-result-header">
                <span className="test-result-icon">
                  {testResult.success ? '✓' : '✕'}
                </span>
                <span className="test-result-title">
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </span>
              </div>
              <div className="test-result-message">{testResult.message}</div>
              {testResult.responseTime && (
                <div className="test-result-time">
                  Response time: {testResult.responseTime}ms
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary btn-test"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving || !formData.apiEndpoint}
            >
              {isTesting ? (
                <>
                  <LoadingSpinner size="small" />
                  Testing...
                </>
              ) : (
                <>
                  🔌 Test Connection
                </>
              )}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving || isTesting}
            >
              {isSaving ? 'Saving...' : '💾 Save Configuration'}
            </button>
          </div>
        </form>

        {/* Help Section */}
        <div className="help-section">
          <h4>📚 Setup Instructions</h4>
          <ol>
            <li>Ensure Tally is running on your computer</li>
            <li>Enable ODBC Server in Tally (Gateway of Tally → F12 → Advanced Configuration → Enable ODBC Server)</li>
            <li>Note the port number (default: 9000)</li>
            <li>Enter the API endpoint above (use http://localhost:9000 if Tally is on the same computer)</li>
            <li>Click "Test Connection" to verify</li>
            <li>If successful, click "Save Configuration"</li>
          </ol>

          <div className="help-note">
            <strong>Note:</strong> For this MVP, Tally must be running on the same computer as this portal.
            Remote Tally connections will be supported in future versions.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TallyConnectionForm;
