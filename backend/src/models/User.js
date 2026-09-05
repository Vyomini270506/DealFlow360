const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'FINANCE_OPERATIONS', 'CUSTOMER'], 
    required: true 
  },
  salesManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Hierarchy: Sales Rep points to Sales Manager
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null }, // External Customer user link
  avatar: { type: String, default: '' },
  pipelineTarget: { type: Number, default: 0 } // For Sales Rep / Manager performance tracking
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
