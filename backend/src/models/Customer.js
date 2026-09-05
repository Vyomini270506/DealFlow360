const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String, required: true },
  tier: { 
    type: String, 
    enum: ['Bronze', 'Silver', 'Gold'], 
    default: 'Bronze' 
  },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  creditLimit: { type: Number, default: 500000 }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
