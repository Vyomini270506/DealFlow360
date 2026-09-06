const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, required: true, unique: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMethod: { 
    type: String, 
    enum: ['BANK_TRANSFER', 'CREDIT_CARD', 'CHEQUE', 'UPI', 'CASH', 'OTHER'], 
    default: 'BANK_TRANSFER' 
  },
  transactionReference: { type: String, default: '' },
  paymentDate: { type: Date, default: Date.now },
  notes: { type: String, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
