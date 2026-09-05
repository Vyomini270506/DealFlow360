const mongoose = require('mongoose');

const categoryLimitSchema = new mongoose.Schema({
  category: { type: String, enum: ['Hardware', 'Services', 'Software'], unique: true, required: true },
  maxDiscountPercentage: { type: Number, required: true } // Hardware: 15, Services: 10, Software: 20
}, { timestamps: true });

module.exports = mongoose.model('CategoryLimit', categoryLimitSchema);
