const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  subscriptionNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  planName: { type: String, required: true }, // e.g. "Cloud Support Enterprise"
  billingCycle: { type: String, default: 'Monthly' },
  billingFrequency: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'], default: 'Monthly' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'ACTIVE', 'Paused', 'PAUSED', 'Cancelled', 'CANCELLED', 'Past Due', 'EXPIRED'], default: 'ACTIVE' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  nextBillingDate: { type: Date },
  billingHistory: [{
    invoiceNumber: String,
    date: Date,
    amount: Number,
    status: { type: String, default: 'UNPAID' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
