/**
 * Line Item Table Component
 * 
 * Display invoice line items with description, quantity, rate, amounts
 * 
 * Requirements: 8.3
 */

import './LineItemTable.css';

const LineItemTable = ({ lineItems }) => {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const formatQuantity = (qty) => {
    return parseFloat(qty || 0).toFixed(2);
  };

  if (!lineItems || lineItems.length === 0) {
    return (
      <div className="line-items-empty">
        <p>No line items available</p>
      </div>
    );
  }

  return (
    <div className="line-items-table-container">
      <table className="line-items-table">
        <thead>
          <tr>
            <th className="col-line-no">#</th>
            <th className="col-description">Description</th>
            <th className="col-quantity">Quantity</th>
            <th className="col-rate">Rate</th>
            <th className="col-amount">Taxable Amount</th>
            <th className="col-amount">Tax Amount</th>
            <th className="col-amount">Total</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => {
            const total = (item.taxableAmount || 0) + (item.taxAmount || 0);
            return (
              <tr key={item._id || index}>
                <td className="col-line-no">{item.lineNumber || index + 1}</td>
                <td className="col-description">
                  <div className="description-text">{item.description || 'N/A'}</div>
                </td>
                <td className="col-quantity">{formatQuantity(item.quantity)}</td>
                <td className="col-rate">{formatAmount(item.rate)}</td>
                <td className="col-amount">{formatAmount(item.taxableAmount)}</td>
                <td className="col-amount">{formatAmount(item.taxAmount)}</td>
                <td className="col-amount total-cell">{formatAmount(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LineItemTable;
