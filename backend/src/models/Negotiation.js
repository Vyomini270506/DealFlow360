const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, required: true },
  itemIndex: { type: Number, default: null }, // Null for general quote/request message, 0..N for line item Q&A
  message: { type: String, required: true },
  counterDiscountPercent: { type: Number, default: null },
  timestamp: { type: Date, default: Date.now }
});

const negotiationHistorySchema = new mongoose.Schema({
  action: { type: String, enum: ['PROPOSED', 'REJECTED', 'REOPENED', 'COUNTER_OFFER', 'APPROVED', 'MANAGER_REQUESTED_CHANGES'], required: true },
  previousDiscount: { type: Number, default: 0 },
  requestedDiscount: { type: Number, default: 0 },
  message: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByRole: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const negotiationSchema = new mongoose.Schema({
  customerRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerRequest', default: null },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', default: null },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  salesManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  attempt: { type: Number, default: 1 },
  status: { 
    type: String, 
    enum: ['Open', 'Active', 'Under Review', 'Resolved', 'Re-approval Required', 'PENDING_MANAGER_APPROVAL', 'Rejected', 'Accepted', 'Closed'], 
    default: 'Open' 
  },
  previousDiscount: { type: Number, default: 0 },
  currentRequestedDiscount: { type: Number, default: 0 },
  managerMaxAllowedDiscount: { type: Number, default: null },
  rejectionReason: { type: String, default: '' },
  customerConfirmation: {
    status: { type: String, enum: ['PENDING', 'CONFIRMED', 'REJECTED'], default: 'PENDING' },
    confirmedAt: { type: Date, default: null }
  },
  salesRepConfirmation: {
    status: { type: String, enum: ['PENDING', 'CONFIRMED', 'REJECTED'], default: 'PENDING' },
    confirmedAt: { type: Date, default: null }
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  messages: [messageSchema],
  history: [negotiationHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Negotiation', negotiationSchema);

