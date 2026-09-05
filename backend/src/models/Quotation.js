const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  finalUnitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
  allowedDiscountPercent: { type: Number, default: 0 },
  approvalRequired: { type: Boolean, default: false },
  breachReason: { type: String, default: '' }
});

const quotationSchema = new mongoose.Schema({
  quoteNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesRep: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [quotationItemSchema],
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, required: true, default: 0 },
  tax: { type: Number, required: true, default: 0 },
  grandTotal: { type: Number, required: true },
  status: {
    type: String,
    enum: [
      'Draft',
      'Pending Approval',
      'Approved',
      'Rejected',
      'Negotiation',
      'Confirmed',
      'Fulfillment',
      'Completed'
    ],
    default: 'Draft'
  },
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  riskReasons: [{ type: String }],
  approvalChainState: {
    type: String,
    enum: ['NONE', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'APPROVED', 'REJECTED'],
    default: 'NONE'
  },
  notes: { type: String, default: '' },
  expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Quotation', quotationSchema);
