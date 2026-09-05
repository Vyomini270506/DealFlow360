const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  shippedQuantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  fulfillment: { type: mongoose.Schema.Types.ObjectId, ref: 'Fulfillment' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['Unpaid', 'Partial', 'Paid', 'Overdue'], 
    default: 'Unpaid' 
  },
  amountPaid: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  reconciliationNotes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
