const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { 
    type: String, 
    enum: ['SUBMITTED', 'APPROVED_BY_MANAGER', 'APPROVED_BY_FINANCE', 'REJECTED', 'RETURNED_FOR_CHANGES', 'CUSTOMER_COUNTER', 'ESCALATED', 'REOPENED'], 
    required: true 
  },
  timestamp: { type: Date, default: Date.now },
  reason: { type: String, default: '' },
  role: { type: String, required: true }
});

const approvalSchema = new mongoose.Schema({
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  customerRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerRequest', default: null },
  negotiation: { type: mongoose.Schema.Types.ObjectId, ref: 'Negotiation', default: null },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedDiscount: { type: Number, default: 0 },
  allowedDiscount: { type: Number, default: 0 },
  currentStep: { 
    type: String, 
    enum: ['SALES_MANAGER', 'FINANCE_OPERATIONS', 'COMPLETED', 'REJECTED'], 
    required: true 
  },
  riskScore: { type: Number, required: true },
  riskLevel: { type: String, required: true },
  riskReasons: [{ type: String }],
  managerApproval: {
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: { type: String, default: '' },
    actionDate: { type: Date }
  },
  financeApproval: {
    status: { type: String, enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'], default: 'NOT_REQUIRED' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: { type: String, default: '' },
    actionDate: { type: Date }
  },
  auditTrail: [auditSchema]
}, { timestamps: true });

module.exports = mongoose.model('Approval', approvalSchema);
