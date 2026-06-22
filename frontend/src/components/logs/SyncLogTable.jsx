/**
 * Sync Log Table Component
 * 
 * Display synchronization logs in reverse chronological order
 * 
 * Requirements: 10.4
 */

import './SyncLogTable.css';

const SyncLogTable = ({ logs }) => {
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getEventTypeDisplay = (eventType) => {
    const eventTypes = {
      import_from_tally: { label: 'Import from Tally', icon: '📥', color: 'blue' },
      buyer_match_attempt: { label: 'Match Attempt', icon: '🔍', color: 'gray' },
      buyer_match_success: { label: 'Match Success', icon: '✓', color: 'green' },
      buyer_match_failed: { label: 'Match Failed', icon: '✕', color: 'orange' },
      invoice_shared_to_buyer: { label: 'Shared to Buyer', icon: '📤', color: 'blue' },
      push_to_tally_attempt: { label: 'Push Attempt', icon: '⏳', color: 'gray' },
      push_to_tally_success: { label: 'Push Success', icon: '✓', color: 'green' },
      push_to_tally_failed: { label: 'Push Failed', icon: '✕', color: 'red' }
    };

    return eventTypes[eventType] || { label: eventType, icon: '•', color: 'gray' };
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      success: { label: 'Success', color: 'green', icon: '✓' },
      failure: { label: 'Failed', color: 'red', icon: '✕' },
      pending: { label: 'Pending', color: 'yellow', icon: '⏳' },
      error: { label: 'Error', color: 'red', icon: '⚠️' }
    };

    return statusMap[status] || { label: status, color: 'gray', icon: '•' };
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="logs-empty-state">
        <div className="empty-icon">📋</div>
        <h3>No logs found</h3>
        <p>Synchronization logs will appear here once you start importing or pushing invoices.</p>
      </div>
    );
  }

  return (
    <div className="sync-log-table-container">
      <div className="table-responsive">
        <table className="sync-log-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event Type</th>
              <th>Invoice ID</th>
              <th>Company</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const eventInfo = getEventTypeDisplay(log.eventType);
              const statusInfo = getStatusBadge(log.status);

              return (
                <tr key={log._id} className={`log-row log-status-${statusInfo.color}`}>
                  <td className="timestamp-cell">
                    <span className="timestamp-value">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </td>

                  <td className="event-type-cell">
                    <span className={`event-badge event-${eventInfo.color}`}>
                      <span className="event-icon">{eventInfo.icon}</span>
                      <span className="event-label">{eventInfo.label}</span>
                    </span>
                  </td>

                  <td className="invoice-id-cell">
                    {log.invoiceId ? (
                      <span className="invoice-id-link" title={log.invoiceId}>
                        {log.invoiceId.substring(0, 8)}...
                      </span>
                    ) : (
                      <span className="no-data">—</span>
                    )}
                  </td>

                  <td className="company-cell">
                    {log.companyId?.name || log.companyId || (
                      <span className="no-data">—</span>
                    )}
                  </td>

                  <td className="status-cell">
                    <span className={`status-badge status-${statusInfo.color}`}>
                      <span className="status-icon">{statusInfo.icon}</span>
                      <span className="status-label">{statusInfo.label}</span>
                    </span>
                  </td>

                  <td className="details-cell">
                    {log.errorMessage ? (
                      <span className="error-message" title={log.errorMessage}>
                        {log.errorMessage}
                      </span>
                    ) : log.metadata ? (
                      <span className="metadata-info" title={JSON.stringify(log.metadata, null, 2)}>
                        {Object.keys(log.metadata).length} metadata fields
                      </span>
                    ) : (
                      <span className="no-data">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="logs-count">
        Showing {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
      </div>
    </div>
  );
};

export default SyncLogTable;
