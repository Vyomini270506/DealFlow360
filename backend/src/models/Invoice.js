const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  shippedQuantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  fulfillment: { type: mongoose.Schema.Types.ObjectId, ref: 'Fulfillment' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['PRODUCT', 'SUBSCRIPTION', 'ONE_TIME', 'RECURRING'], default: 'ONE_TIME' },
  items: [invoiceItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['Unpaid', 'UNPAID', 'Partial', 'PARTIALLY_PAID', 'Paid', 'PAID', 'Overdue', 'OVERDUE'], 
    default: 'UNPAID' 
  },
  deliveryStatus: {
    type: String,
    enum: ['PENDING', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'BACKORDERED'],
    default: 'PENDING'
  },
  amountPaid: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  reconciliationNotes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
