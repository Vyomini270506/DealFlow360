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
      'Submitted',
      'Processing',
      'In Review',
      'Approved_Rep',
      'Rejected_Rep',
      'Escalated_Manager',
      'WAITING_FOR_FINANCE',
      'FINANCE_REVIEWED',
      'Approved_Manager',
      'Rejected_Manager',
      'Negotiation_Required',
      'Quotation Sent',
      'Quoted',
      'Completed',
      'Cancelled',
      'Closed',
      'DISCARDED',
      'PENDING',
      'UNDER_REVIEW',
      'NEGOTIATION',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
      'STOPPED'
    ],
    default: 'Pending'
  },
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  approvalRequired: { type: Boolean, default: false },
  managerApprovalRequired: { type: Boolean, default: false },
  financeReviewRequired: { type: Boolean, default: false },
  riskFactors: [{ type: mongoose.Schema.Types.Mixed }],
  riskReasons: [{ type: String }],
  escalationReason: { type: String, default: '' },
  managerComment: { type: String, default: '' },
  financeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  financeDecision: { type: String, enum: ['SUPPORT', 'DO_NOT_SUPPORT', 'REQUEST_CHANGES', 'SUGGEST_CHANGES', 'COMMENT', 'NONE'], default: 'NONE' },
  financeComment: { type: String, default: '' },
  financeDecisionAt: { type: Date, default: null },
  activeNegotiation: { type: mongoose.Schema.Types.ObjectId, ref: 'Negotiation', default: null },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', default: null }
}, { timestamps: true });

module.exports = mongoose.model('CustomerRequest', customerRequestSchema);
