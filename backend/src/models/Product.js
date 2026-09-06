const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  category: { 
    type: String, 
    enum: ['Hardware', 'Services', 'Software'], 
    required: true 
  },
  unitPrice: { type: Number, required: true },
  cost: { type: Number, required: true },
  description: { type: String, default: '' },
  type: { 
    type: String, 
    enum: ['ONE_TIME', 'RECURRING'], 
    default: 'ONE_TIME' 
  },
  billingFrequency: { 
    type: String, 
    enum: ['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'NONE'], 
    default: 'NONE' 
  },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
