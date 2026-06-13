/**
 * Invoice Table Component
 * 
 * Display invoice list in table format with action buttons
 * 
 * Requirements: 6.2, 7.2, 13.7
 */

import { useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import InvoiceDetailModal from './InvoiceDetailModal';
import './InvoiceTable.css';

const InvoiceTable = ({ invoices, userRole, onPushToTally, onUpdateStatus }) => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedInvoice(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const canPushToTally = (invoice) => {
    return (
      userRole === 'buyer_admin' &&
      invoice.status !== 'Pushed_to_Tally' &&
      invoice.status !== 'Failed'
    );
  };

  const canUpdateStatus = (invoice) => {
    return (
      userRole === 'buyer_admin' &&
      invoice.status === 'New'
    );
  };

  if (!invoices || invoices.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📄</div>
        <h3>No invoices found</h3>
        <p>
          {userRole === 'seller_admin'
            ? 'Import invoices from Tally to get started'
            : 'No invoices have been shared with you yet'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="invoice-table-container">
        <div className="table-responsive">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Seller</th>
                <th>Buyer</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice._id} className={invoice.status === 'Unmatched' ? 'row-unmatched' : ''}>
                  <td className="invoice-number">{invoice.invoiceNumber}</td>
                  <td>{formatDate(invoice.invoiceDate)}</td>
                  <td>
                    <div className="company-cell">
                      <div className="company-name">
                        {invoice.sellerCompanyId?.name || invoice.sellerCompanyName || 'N/A'}
                      </div>
                      {invoice.sellerCompanyId?.gstin && (
                        <div className="company-gstin">{invoice.sellerCompanyId.gstin}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="company-cell">
                      <div className="company-name">
                        {invoice.buyerCompanyId?.name || invoice.buyerCompanyName || 'N/A'}
                      </div>
                      {invoice.buyerCompanyId?.gstin && (
                        <div className="company-gstin">{invoice.buyerCompanyId.gstin}</div>
                      )}
                    </div>
                  </td>
                  <td className="amount">{formatAmount(invoice.totalAmount)}</td>
                  <td>
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleViewDetails(invoice)}
                        className="btn-action btn-view"
                        title="View Details"
                      >
                        👁️ View
                      </button>

                      {canUpdateStatus(invoice) && (
                        <>
                          <button
                            onClick={() => onUpdateStatus(invoice._id, 'Accepted')}
                            className="btn-action btn-accept"
                            title="Accept Invoice"
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => onUpdateStatus(invoice._id, 'Rejected')}
                            className="btn-action btn-reject"
                            title="Reject Invoice"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}

                      {canPushToTally(invoice) && (
                        <button
                          onClick={() => onPushToTally(invoice._id)}
                          className="btn-action btn-push"
                          title="Push to Tally"
                        >
                          📤 Push
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedInvoice && (
        <InvoiceDetailModal invoice={selectedInvoice} onClose={handleCloseModal} />
      )}
    </>
  );
};

export default InvoiceTable;
