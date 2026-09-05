const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, required: true },
  itemIndex: { type: Number, default: null }, // Null for general quote message, 0..N for line item Q&A
  message: { type: String, required: true },
  counterDiscountPercent: { type: Number, default: null },
  timestamp: { type: Date, default: Date.now }
});

const negotiationSchema = new mongoose.Schema({
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Open', 'Under Review', 'Resolved', 'Re-approval Required'], default: 'Open' },
  messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Negotiation', negotiationSchema);
