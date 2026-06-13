/**
 * Sync Logs Page
 * 
 * Page for viewing and filtering synchronization logs
 * 
 * Requirements: 13.6
 */

import { useState, useEffect } from 'react';
import logService from '../services/logService';
import LogFilter from '../components/logs/LogFilter';
import SyncLogTable from '../components/logs/SyncLogTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import './SyncLogsPage.css';

const SyncLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await logService.getLogs(filters);
      setLogs(data);
    } catch (err) {
      setError(err.message || 'Failed to load logs');
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load logs'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
    loadLogs(filters);
  };

  const handleReset = () => {
    setActiveFilters({});
    loadLogs();
  };

  return (
    <div className="sync-logs-page">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="page-header">
        <h1>📋 Synchronization Logs</h1>
        <p>Track all invoice synchronization activities and events</p>
      </div>

      <div className="page-content">
        <LogFilter 
          onFilterChange={handleFilterChange} 
          onReset={handleReset} 
        />

        {loading ? (
          <div className="loading-container">
            <LoadingSpinner />
            <p>Loading logs...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>❌ {error}</p>
            <button className="btn btn-secondary" onClick={() => loadLogs(activeFilters)}>
              Retry
            </button>
          </div>
        ) : (
          <SyncLogTable logs={logs} />
        )}
      </div>
    </div>
  );
};

export default SyncLogsPage;
