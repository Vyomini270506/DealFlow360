const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, default: '' },
  company: { type: String, required: true },
  tier: { 
    type: String, 
    enum: ['Bronze', 'Silver', 'Gold'], 
    default: 'Bronze' 
  },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  creditLimit: { type: Number, default: 500000 },
  assignedSalesManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedSalesRepresentative: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignmentStatus: { 
    type: String, 
    enum: ['UNASSIGNED', 'MANAGER_ASSIGNED', 'REP_ASSIGNED'], 
    default: 'UNASSIGNED' 
  },
  assignedAt: { type: Date }
}, { timestamps: true });

customerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

customerSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Customer', customerSchema);
