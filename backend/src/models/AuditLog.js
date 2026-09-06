const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  recordType: { 
    type: String, 
    enum: ['CustomerRequest', 'Quotation', 'Approval', 'Negotiation', 'Order', 'Invoice', 'Subscription', 'Fulfillment', 'Backorder', 'Customer'],
    required: true 
  },
  recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, required: true },
  previousStatus: { type: String, default: '' },
  newStatus: { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performerRole: { type: String, default: 'SYSTEM' },
  comment: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
