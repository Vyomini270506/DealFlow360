const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, required: true },
  itemIndex: { type: Number, default: null }, // Null for general quote message, 0..N for line item Q&A
  message: { type: String, required: true },
  counterDiscountPercent: { type: Number, default: null },
  timestamp: { type: Date, default: Date.now }
});

const negotiationHistorySchema = new mongoose.Schema({
  action: { type: String, enum: ['PROPOSED', 'REJECTED', 'REOPENED', 'COUNTER_OFFER', 'APPROVED'], required: true },
  previousDiscount: { type: Number, default: 0 },
  requestedDiscount: { type: Number, default: 0 },
  message: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByRole: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const negotiationSchema = new mongoose.Schema({
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['Open', 'Under Review', 'Resolved', 'Re-approval Required', 'Rejected'], default: 'Open' },
  previousDiscount: { type: Number, default: 0 },
  currentRequestedDiscount: { type: Number, default: 0 },
  rejectionReason: { type: String, default: '' },
  messages: [messageSchema],
  history: [negotiationHistorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Negotiation', negotiationSchema);
