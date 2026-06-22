/**
 * Log Filter Component
 * 
 * Filter controls for sync logs by invoice ID, company, event type, date range
 * 
 * Requirements: 10.5
 */

import { useState } from 'react';
import './LogFilter.css';

const LogFilter = ({ onFilterChange, onReset }) => {
  const [filters, setFilters] = useState({
    invoiceId: '',
    companyId: '',
    eventType: '',
    startDate: '',
    endDate: ''
  });

  const eventTypes = [
    { value: '', label: 'All Events' },
    { value: 'import_from_tally', label: 'Import from Tally' },
    { value: 'buyer_match_attempt', label: 'Match Attempt' },
    { value: 'buyer_match_success', label: 'Match Success' },
    { value: 'buyer_match_failed', label: 'Match Failed' },
    { value: 'invoice_shared_to_buyer', label: 'Shared to Buyer' },
    { value: 'push_to_tally_attempt', label: 'Push Attempt' },
    { value: 'push_to_tally_success', label: 'Push Success' },
    { value: 'push_to_tally_failed', label: 'Push Failed' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    
    // Build filter object with only non-empty values
    const activeFilters = {};
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        activeFilters[key] = filters[key];
      }
    });

    onFilterChange(activeFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      invoiceId: '',
      companyId: '',
      eventType: '',
      startDate: '',
      endDate: ''
    };
    setFilters(resetFilters);
    onReset();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="log-filter-container">
      <form onSubmit={handleApplyFilters} className="log-filter-form">
        <div className="filter-header">
          <h3>🔍 Filter Logs</h3>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={handleReset}
              title="Clear all filters"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        <div className="filter-grid">
          {/* Invoice ID Filter */}
          <div className="filter-group">
            <label htmlFor="invoiceId">Invoice ID</label>
            <input
              type="text"
              id="invoiceId"
              name="invoiceId"
              value={filters.invoiceId}
              onChange={handleInputChange}
              className="filter-input"
              placeholder="Enter invoice ID"
            />
          </div>

          {/* Company ID Filter */}
          <div className="filter-group">
            <label htmlFor="companyId">Company ID</label>
            <input
              type="text"
              id="companyId"
              name="companyId"
              value={filters.companyId}
              onChange={handleInputChange}
              className="filter-input"
              placeholder="Enter company ID"
            />
          </div>

          {/* Event Type Filter */}
          <div className="filter-group">
            <label htmlFor="eventType">Event Type</label>
            <select
              id="eventType"
              name="eventType"
              value={filters.eventType}
              onChange={handleInputChange}
              className="filter-select"
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="filter-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleInputChange}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleInputChange}
              className="filter-input"
            />
          </div>

          {/* Apply Button */}
          <div className="filter-group filter-actions">
            <button type="submit" className="btn btn-primary btn-apply">
              Apply Filters
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LogFilter;
