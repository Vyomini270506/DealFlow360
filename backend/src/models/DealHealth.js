const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: { type: String, enum: ['DISCOUNT_ANOMALY', 'DELIVERY_SLIPPAGE', 'APPROVAL_BOTTLENECK', 'CUSTOMER_NEGOTIATION', 'AT_RISK_DEAL'], required: true },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  message: { type: String, required: true },
  whyItMatters: { type: String, required: true },
  recommendedAction: { type: String, required: true }
});

const dealHealthSchema = new mongoose.Schema({
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dealValue: { type: Number, required: true },
  healthScore: { type: Number, required: true }, // 0-100 (100 = healthiest)
  riskScore: { type: Number, required: true },   // 0-100
  alerts: [alertSchema]
}, { timestamps: true });

module.exports = mongoose.model('DealHealth', dealHealthSchema);
