const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  subscriptionNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  planName: { type: String, required: true }, // e.g. "Cloud Support Enterprise"
  billingCycle: { type: String, enum: ['Monthly', 'Yearly'], default: 'Monthly' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Paused', 'Cancelled', 'Past Due'], default: 'Active' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  nextBillingDate: { type: Date },
  billingHistory: [{
    invoiceNumber: String,
    date: Date,
    amount: Number,
    status: { type: String, enum: ['Paid', 'Pending', 'Failed'] }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
