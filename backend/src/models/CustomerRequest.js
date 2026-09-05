const mongoose = require('mongoose');

const requestItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  desiredDiscountPercent: { type: Number, default: 0, min: 0, max: 100 }
});

const customerRequestSchema = new mongoose.Schema({
  requestNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedSalesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [requestItemSchema],
  message: { type: String, default: '' },
  status: {
    type: String,
    enum: [
      'Pending',
      'In Review',
      'Escalated_Manager',
      'Approved_Manager',
      'Rejected_Manager',
      'Quoted',
      'Completed',
      'Cancelled'
    ],
    default: 'Pending'
  },
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  riskReasons: [{ type: String }],
  escalationReason: { type: String, default: '' },
  managerComment: { type: String, default: '' },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', default: null }
}, { timestamps: true });

module.exports = mongoose.model('CustomerRequest', customerRequestSchema);
