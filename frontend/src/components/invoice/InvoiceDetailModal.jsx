/**
 * Invoice Detail Modal Component
 * 
 * Display complete invoice details with line items
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { useEffect, useState } from 'react';
import LineItemTable from './LineItemTable';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import invoiceService from '../../services/invoiceService';
import './InvoiceDetailModal.css';

const InvoiceDetailModal = ({ invoice, onClose }) => {
  const [fullInvoice, setFullInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await invoiceService.getInvoiceById(invoice._id);
        setFullInvoice(data);
      } catch (err) {
        setError(err.message || 'Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [invoice._id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Handle click outside modal
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      onClose();
    }
  };

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content invoice-detail-modal">
        <div className="modal-header">
          <h2>Invoice Details</h2>
          <button className="btn-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {loading && <LoadingSpinner />}

          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
            </div>
          )}

          {!loading && !error && fullInvoice && (
            <>
              {/* Invoice Header */}
              <div className="invoice-header-section">
                <div className="invoice-header-row">
                  <div className="invoice-meta">
                    <div className="invoice-number-large">
                      <label>Invoice Number</label>
                      <span>{fullInvoice.invoiceNumber}</span>
                    </div>
                    <div className="invoice-date">
                      <label>Invoice Date</label>
                      <span>{formatDate(fullInvoice.invoiceDate)}</span>
                    </div>
                  </div>
                  <div className="invoice-status-section">
                    <label>Status</label>
                    <StatusBadge status={fullInvoice.status} />
                    {fullInvoice.statusChangedAt && (
                      <div className="status-timestamp">
                        Last updated: {formatDateTime(fullInvoice.statusChangedAt)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Seller and Buyer Information */}
                <div className="company-details-row">
                  <div className="company-box seller-box">
                    <h3>Seller Details</h3>
                    <div className="company-info">
                      <div className="info-row">
                        <label>Company Name:</label>
                        <span>{fullInvoice.sellerCompanyId?.name || fullInvoice.sellerCompanyName || 'N/A'}</span>
                      </div>
                      <div className="info-row">
                        <label>GSTIN:</label>
                        <span>{fullInvoice.sellerCompanyId?.gstin || fullInvoice.sellerGstin || 'N/A'}</span>
                      </div>
                      {fullInvoice.sellerAddress && (
                        <div className="info-row">
                          <label>Address:</label>
                          <span>{fullInvoice.sellerAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="company-box buyer-box">
                    <h3>Buyer Details</h3>
                    <div className="company-info">
                      <div className="info-row">
                        <label>Company Name:</label>
                        <span>{fullInvoice.buyerCompanyId?.name || fullInvoice.buyerCompanyName || 'N/A'}</span>
                      </div>
                      <div className="info-row">
                        <label>GSTIN:</label>
                        <span>{fullInvoice.buyerCompanyId?.gstin || fullInvoice.buyerGstin || 'N/A'}</span>
                      </div>
                      {fullInvoice.buyerAddress && (
                        <div className="info-row">
                          <label>Address:</label>
                          <span>{fullInvoice.buyerAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="line-items-section">
                <h3>Line Items</h3>
                <LineItemTable lineItems={fullInvoice.lineItems || []} />
              </div>

              {/* Totals */}
              <div className="totals-section">
                <div className="totals-grid">
                  <div className="total-row">
                    <label>Subtotal (Taxable Amount):</label>
                    <span className="total-value">{formatAmount(fullInvoice.subtotal || 0)}</span>
                  </div>
                  <div className="total-row">
                    <label>Total Tax:</label>
                    <span className="total-value">{formatAmount(fullInvoice.totalTax || 0)}</span>
                  </div>
                  <div className="total-row grand-total">
                    <label>Grand Total:</label>
                    <span className="total-value">{formatAmount(fullInvoice.totalAmount || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="additional-info-section">
                <div className="info-grid">
                  {fullInvoice.sourceReferenceId && (
                    <div className="info-item">
                      <label>Source Reference:</label>
                      <span>{fullInvoice.sourceReferenceId}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <label>Created At:</label>
                    <span>{formatDateTime(fullInvoice.createdAt)}</span>
                  </div>
                  {fullInvoice.pushedToTallyAt && (
                    <div className="info-item">
                      <label>Pushed to Tally At:</label>
                      <span>{formatDateTime(fullInvoice.pushedToTallyAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailModal;
