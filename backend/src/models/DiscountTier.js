const mongoose = require('mongoose');

const discountTierSchema = new mongoose.Schema({
  tier: { type: String, enum: ['Iron', 'Bronze', 'Silver', 'Gold'], unique: true, required: true },
  maxDiscountPercentage: { type: Number, required: true } // Iron: 3, Bronze: 5, Silver: 10, Gold: 15
}, { timestamps: true });

module.exports = mongoose.model('DiscountTier', discountTierSchema);
