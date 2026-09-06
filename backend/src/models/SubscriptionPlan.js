const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  billingFrequency: { 
    type: String, 
    enum: ['Monthly', 'Quarterly', 'Yearly', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'], 
    default: 'Monthly' 
  },
  durationMonths: { type: Number, default: 12 },
  status: { type: String, enum: ['Active', 'Inactive', 'ACTIVE', 'INACTIVE'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
