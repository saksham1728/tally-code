/**
 * InvoiceLineItem Model
 * 
 * Represents a single line item within an invoice, including product details,
 * quantities, rates, and tax amounts.
 * 
 * Requirements: 19.4
 */

const mongoose = require('mongoose');

const invoiceLineItemSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Invoice ID is required']
  },
  lineNumber: {
    type: Number,
    required: [true, 'Line number is required'],
    min: [1, 'Line number must be at least 1']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  taxableAmount: {
    type: Number,
    required: [true, 'Taxable amount is required'],
    min: [0, 'Taxable amount cannot be negative']
  },
  taxAmount: {
    type: Number,
    required: [true, 'Tax amount is required'],
    min: [0, 'Tax amount cannot be negative']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes (Requirement 19.4)
invoiceLineItemSchema.index({ invoiceId: 1 });
invoiceLineItemSchema.index({ invoiceId: 1, lineNumber: 1 }); // Compound index for efficient querying

/**
 * Virtual property to calculate line item total
 */
invoiceLineItemSchema.virtual('total').get(function() {
  return this.taxableAmount + this.taxAmount;
});

/**
 * Static method to find all line items for an invoice
 * 
 * @param {string} invoiceId - Invoice ID to search for
 * @returns {Promise<Array<InvoiceLineItem>>} Array of line items
 */
invoiceLineItemSchema.statics.findByInvoice = function(invoiceId) {
  return this.find({ invoiceId }).sort({ lineNumber: 1 });
};

/**
 * Static method to calculate total for all line items of an invoice
 * 
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} Object with taxableTotal, taxTotal, and grandTotal
 */
invoiceLineItemSchema.statics.calculateInvoiceTotal = async function(invoiceId) {
  const lineItems = await this.find({ invoiceId });
  
  const taxableTotal = lineItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  const taxTotal = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = taxableTotal + taxTotal;
  
  return {
    taxableTotal,
    taxTotal,
    grandTotal
  };
};

const InvoiceLineItem = mongoose.model('InvoiceLineItem', invoiceLineItemSchema);

module.exports = InvoiceLineItem;
