const mongoose = require('mongoose');

const priceListSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customerTier: { type: String, enum: ['Bronze', 'Silver', 'Gold'], required: true },
  salesPrice: { type: Number, required: true },
  effectiveDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('PriceList', priceListSchema);
