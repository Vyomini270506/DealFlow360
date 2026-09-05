const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true }
});

const fulfillmentItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  requestedQuantity: { type: Number, required: true },
  fulfilledQuantity: { type: Number, default: 0 },
  backorderQuantity: { type: Number, default: 0 },
  allocations: [allocationSchema]
});

const fulfillmentSchema = new mongoose.Schema({
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  status: { 
    type: String, 
    enum: ['Awaiting Allocation', 'Partially Fulfilled', 'Fulfilled', 'Delivery Slippage'], 
    default: 'Awaiting Allocation' 
  },
  items: [fulfillmentItemSchema],
  trackingNumber: { type: String, default: '' },
  estimatedDelivery: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Fulfillment', fulfillmentSchema);
