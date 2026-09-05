const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['APPROVAL_REQ', 'APPROVAL_DECISION', 'NEGOTIATION_UPDATE', 'FULFILLMENT_UPDATE', 'SYSTEM'], default: 'SYSTEM' },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
