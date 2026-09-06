const mongoose = require('mongoose');

const creditNoteSchema = new mongoose.Schema({
  creditNoteNumber: { type: String, required: true, unique: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true, min: 0.01 },
  reason: { 
    type: String, 
    enum: ['REFUND', 'CANCELLED_QUANTITY', 'PRICING_CORRECTION', 'BILLING_CORRECTION', 'APPROVED_ADJUSTMENT', 'OTHER'], 
    required: true 
  },
  description: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['DRAFT', 'APPROVED', 'APPLIED', 'CANCELLED'], 
    default: 'APPROVED' 
  },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issuedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('CreditNote', creditNoteSchema);
