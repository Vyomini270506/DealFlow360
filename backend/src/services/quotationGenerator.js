const Quotation = require('../models/Quotation');
const Product = require('../models/Product');
const User = require('../models/User');
const CustomerRequest = require('../models/CustomerRequest');
const { logAudit } = require('./auditService');

/**
 * Single source of truth for generating an official Quotation from an Approved Customer Request.
 * Automatically creates the Quotation document, links it, sets status to Approved/Sent,
 * makes it immediately available in Customer Portal, and logs audit events.
 */
const generateQuotationFromApprovedRequest = async ({ customerRequest, approvedByUserId, userRole }) => {
  // Idempotency check: if a Quotation already exists for this request, return it
  let quotation = await Quotation.findOne({ customerRequest: customerRequest._id, status: { $ne: 'DISCARDED' } });
  if (quotation) {
    return quotation;
  }

  const formattedItems = [];
  let subtotal = 0;
  let totalDiscount = 0;

  for (const item of customerRequest.items) {
    const prodId = item.product._id || item.product;
    const product = await Product.findById(prodId);
    if (!product) continue;

    const qty = Number(item.quantity) || 1;
    const discount = Number(item.desiredDiscountPercent) || 0;
    const unitPrice = product.unitPrice;
    const finalUnitPrice = unitPrice * (1 - discount / 100);
    const lineTotal = finalUnitPrice * qty;

    formattedItems.push({
      product: product._id,
      quantity: qty,
      unitPrice,
      discountPercent: discount,
      finalUnitPrice: Number(finalUnitPrice.toFixed(2)),
      lineTotal: Number(lineTotal.toFixed(2)),
      allowedDiscountPercent: 15
    });

    subtotal += unitPrice * qty;
    totalDiscount += (unitPrice * (discount / 100)) * qty;
  }

  const afterDiscount = subtotal - totalDiscount;
  const tax = Number((afterDiscount * 0.18).toFixed(2));
  const grandTotal = Number((afterDiscount + tax).toFixed(2));

  const count = await Quotation.countDocuments();
  const quoteNumber = `Q-${1000 + count + 1}`;

  const salesRepUser = await User.findById(customerRequest.assignedSalesRep);
  const assignedManagerId = salesRepUser?.salesManagerId || null;

  quotation = await Quotation.create({
    quoteNumber,
    customer: customerRequest.customer._id || customerRequest.customer,
    customerRequest: customerRequest._id,
    salesRep: customerRequest.assignedSalesRep,
    assignedSalesManager: assignedManagerId,
    items: formattedItems,
    subtotal: Number(subtotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    tax,
    grandTotal,
    status: 'Approved', // Sent to customer immediately
    sellerAgreed: true, // Approval represents seller's agreement
    customerAgreed: false,
    salesRepConfirmed: true,
    riskScore: customerRequest.riskScore || 10,
    riskLevel: customerRequest.riskLevel || 'LOW',
    approvalChainState: 'APPROVED'
  });

  const prevStatus = customerRequest.status;
  customerRequest.status = 'Quoted';
  await customerRequest.save();

  // Audit Logs
  await logAudit({
    recordType: 'CustomerRequest',
    recordId: customerRequest._id,
    action: 'REQUEST_APPROVED',
    previousStatus: prevStatus,
    newStatus: 'Quoted',
    performedBy: approvedByUserId,
    performerRole: userRole,
    comment: 'Request approved by authorized seller'
  });

  await logAudit({
    recordType: 'Quotation',
    recordId: quotation._id,
    action: 'SELLER_AGREED',
    previousStatus: 'Draft',
    newStatus: 'Approved',
    performedBy: approvedByUserId,
    performerRole: userRole,
    comment: 'Seller has approved terms and agreed to quotation'
  });

  await logAudit({
    recordType: 'Quotation',
    recordId: quotation._id,
    action: 'QUOTATION_CREATED',
    previousStatus: '',
    newStatus: 'Approved',
    performedBy: approvedByUserId,
    performerRole: userRole,
    comment: `Quotation ${quoteNumber} automatically generated from approved request`
  });

  await logAudit({
    recordType: 'Quotation',
    recordId: quotation._id,
    action: 'QUOTATION_SENT',
    previousStatus: 'Draft',
    newStatus: 'Approved',
    performedBy: approvedByUserId,
    performerRole: userRole,
    comment: `Quotation ${quoteNumber} automatically sent to customer portal`
  });

  return quotation;
};

module.exports = { generateQuotationFromApprovedRequest };
