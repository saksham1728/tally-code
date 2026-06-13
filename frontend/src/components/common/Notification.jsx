/**
 * Notification Component
 * 
 * Display success and error messages with auto-dismiss
 * 
 * Requirements: 13.9
 */

import { useEffect } from 'react';
import './Notification.css';

const Notification = ({ type = 'info', message, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-message">{message}</div>
      {onClose && (
        <button className="notification-close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};

export default Notification;
