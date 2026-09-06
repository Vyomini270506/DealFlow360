const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['REGISTER', 'LOGIN', 'FORGOT_PASSWORD'], default: 'REGISTER' },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Auto-expire documents after expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
