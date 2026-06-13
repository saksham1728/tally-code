/**
 * Status Badge Component
 * 
 * Display color-coded badges for invoice statuses
 * 
 * Requirements: 6.2, 7.2
 */

import './StatusBadge.css';

const StatusBadge = ({ status }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'New':
        return 'status-new';
      case 'Accepted':
        return 'status-accepted';
      case 'Rejected':
        return 'status-rejected';
      case 'Pushed_to_Tally':
        return 'status-pushed';
      case 'Failed':
        return 'status-failed';
      case 'Unmatched':
        return 'status-unmatched';
      default:
        return 'status-default';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'Pushed_to_Tally':
        return 'Pushed to Tally';
      default:
        return status;
    }
  };

  return (
    <span className={`status-badge ${getStatusClass()}`}>
      {getStatusLabel()}
    </span>
  );
};

export default StatusBadge;
