const mongoose = require('mongoose');

const backorderSchema = new mongoose.Schema({
  fulfillment: { type: mongoose.Schema.Types.ObjectId, ref: 'Fulfillment', required: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Stock Received', 'Fulfilled'], default: 'Pending' },
  estimatedArrival: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Backorder', backorderSchema);
