const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  finalUnitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  orderStatus: {
    type: String,
    enum: ['CONFIRMED', 'PROCESSING', 'FULFILLED', 'PARTIALLY_FULFILLED', 'CANCELLED'],
    default: 'CONFIRMED'
  },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  fulfillment: { type: mongoose.Schema.Types.ObjectId, ref: 'Fulfillment', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
