const mongoose = require('mongoose');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Quotation = require('../models/Quotation');
const CustomerRequest = require('../models/CustomerRequest');
const Approval = require('../models/Approval');
const Negotiation = require('../models/Negotiation');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Invoice = require('../models/Invoice');
const Fulfillment = require('../models/Fulfillment');
const { calculateBlendedDiscountRisk } = require('./riskEngine');

/**
 * 1. DEAL RISK RADAR
 * Extends discount risk with operational, payment, stock & negotiation risks.
 */
const getDealRiskRadar = async (quotationId) => {
  if (!quotationId || !mongoose.Types.ObjectId.isValid(quotationId)) {
    return { riskScore: 0, riskLevel: 'LOW', riskReasons: [], riskFactors: [] };
  }

  const quotation = await Quotation.findById(quotationId)
    .populate('customer')
    .populate('items.product');

  if (!quotation) {
    return { riskScore: 0, riskLevel: 'LOW', riskReasons: [], riskFactors: [] };
  }

  const riskAnalysis = await calculateBlendedDiscountRisk({
    items: quotation.items,
    customerId: quotation.customer
  });

  const additionalReasons = [...(riskAnalysis.riskReasons || [])];
  let extraScore = 0;

  // Check Approval Delays (> 48h)
  const approval = await Approval.findOne({ quotation: quotation._id, currentStep: { $ne: 'COMPLETED' } });
  if (approval && approval.createdAt && (Date.now() - new Date(approval.createdAt).getTime()) > 48 * 60 * 60 * 1000) {
    extraScore += 3;
    additionalReasons.push('⚠ Approval pending for over 48 hours without decision');
  }

  // Check Negotiation Activity
  const negotiation = await Negotiation.findOne({ quotation: quotation._id });
  if (negotiation && negotiation.messages && negotiation.messages.length > 4) {
    extraScore += 2;
    additionalReasons.push(`⚠ High negotiation frequency (${negotiation.messages.length} messages exchanged)`);
  }

  // Check Stock Availability
  let stockShortage = false;
  for (const item of quotation.items) {
    const prodId = item.product?._id || item.product;
    const inventories = await Inventory.find({ product: prodId });
    const totalAvailable = inventories.reduce((sum, inv) => sum + (inv.stockQuantity - inv.reservedQuantity), 0);
    if (totalAvailable < item.quantity) {
      stockShortage = true;
      additionalReasons.push(`⚠ Stock shortage for ${item.product?.name || 'Product'}: Required ${item.quantity}, Available ${totalAvailable}`);
    }
  }
  if (stockShortage) extraScore += 4;

  const totalScore = Number((riskAnalysis.riskScore + extraScore).toFixed(2));
  let finalLevel = 'LOW';
  if (totalScore > 5) finalLevel = 'HIGH';
  else if (totalScore > 0) finalLevel = 'MEDIUM';

  return {
    riskScore: totalScore,
    riskLevel: finalLevel,
    riskReasons: additionalReasons,
    riskFactors: riskAnalysis.riskFactors
  };
};

/**
 * 2. DEAL HEALTH SCORE (0-100)
 */
const getDealHealthScore = async (quotationId) => {
  if (!quotationId || !mongoose.Types.ObjectId.isValid(quotationId)) {
    return { healthScore: 100, healthStatus: 'HEALTHY', factors: [] };
  }

  const quotation = await Quotation.findById(quotationId).populate('items.product');
  if (!quotation) return { healthScore: 100, healthStatus: 'HEALTHY', factors: [] };

  let score = 100;
  const factors = [];

  // 1. Discount Risk Deduction
  const riskAnalysis = await calculateBlendedDiscountRisk({
    items: quotation.items,
    customerId: quotation.customer
  });

  if (riskAnalysis.riskScore > 0) {
    const riskDeduction = Math.min(40, Math.round(riskAnalysis.riskScore * 4));
    score -= riskDeduction;
    factors.push(`Discount Risk (-${riskDeduction} pts)`);
  }

  // 2. Negotiation Activity Deduction
  const negotiation = await Negotiation.findOne({ quotation: quotation._id });
  if (negotiation && negotiation.messages && negotiation.messages.length > 2) {
    const negDeduction = (negotiation.messages.length - 2) * 5;
    score -= negDeduction;
    factors.push(`Extended Negotiation (-${negDeduction} pts)`);
  }

  // 3. Approval Delay Deduction
  const approval = await Approval.findOne({ quotation: quotation._id, currentStep: { $ne: 'COMPLETED' } });
  if (approval && (Date.now() - new Date(approval.createdAt).getTime()) > 48 * 60 * 60 * 1000) {
    score -= 15;
    factors.push('Approval Delay >48h (-15 pts)');
  }

  // 4. Payment Overdue Deduction
  const invoice = await Invoice.findOne({ quotation: quotation._id });
  if (invoice && invoice.paymentStatus === 'UNPAID' && invoice.dueDate && new Date() > new Date(invoice.dueDate)) {
    score -= 20;
    factors.push('Overdue Payment (-20 pts)');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let status = 'HEALTHY';
  if (score < 50) status = 'CRITICAL';
  else if (score < 75) status = 'AT RISK';

  return {
    healthScore: score,
    healthStatus: status,
    factors
  };
};

/**
 * 3. AI BEST COUNTER-OFFER RECOMMENDATION
 */
const getBestCounterOffer = async (quotationId, requestedDiscountPercent) => {
  if (!quotationId || !mongoose.Types.ObjectId.isValid(quotationId)) {
    return {
      originalRequestedDiscount: 0,
      recommendedDiscount: 0,
      perks: [],
      estimatedMarginProtected: 0,
      recommendationSummary: 'No active quotation provided.'
    };
  }

  const quotation = await Quotation.findById(quotationId).populate('items.product').populate('customer');
  if (!quotation) {
    return {
      originalRequestedDiscount: 0,
      recommendedDiscount: 0,
      perks: [],
      estimatedMarginProtected: 0,
      recommendationSummary: 'Quotation not found.'
    };
  }

  const requestedDisc = Number(requestedDiscountPercent || 0);

  // Calculate tier allowed limit
  const riskAnalysis = await calculateBlendedDiscountRisk({
    items: quotation.items,
    customerId: quotation.customer
  });

  let maxAllowed = 10;
  if (riskAnalysis.riskFactors && riskAnalysis.riskFactors.length > 0) {
    maxAllowed = riskAnalysis.riskFactors[0].allowedDiscount;
  }

  const recommendedDiscount = Math.min(requestedDisc, maxAllowed);
  const totalSubtotal = quotation.subtotal || 100000;

  // Margin protected calculation
  const marginProtected = Number(((totalSubtotal * ((requestedDisc - recommendedDiscount) / 100))).toFixed(2));

  let perks = [];
  if (requestedDisc > maxAllowed) {
    perks.push('Free On-Site Installation & Setup');
    perks.push('Complimentary 3-Month Priority 24/7 Care Support');
  } else {
    perks.push('Extended Net 45 Payment Terms');
  }

  return {
    originalRequestedDiscount: requestedDisc,
    recommendedDiscount,
    perks,
    estimatedMarginProtected: Math.max(0, marginProtected),
    recommendationSummary: `Counter with ${recommendedDiscount}% discount + ${perks[0]} to protect ₹${Math.max(0, marginProtected).toLocaleString()} in gross margin.`
  };
};

/**
 * 4. PROFIT PROTECTION MODE
 */
const calculateProfitProtection = async (items, customerId) => {
  if (!items || !Array.isArray(items)) return null;

  let currentSubtotal = 0;
  let currentTotalMargin = 0;
  let proposedSubtotal = 0;
  let proposedTotalMargin = 0;

  for (const item of items) {
    const prodId = item.product?._id || item.product;
    const product = (item.product && item.product.unitPrice) ? item.product : await Product.findById(prodId);
    if (!product) continue;

    const qty = Number(item.quantity) || 1;
    const unitPrice = product.unitPrice;
    const marginPct = product.marginPercentage || 25;
    const unitCost = unitPrice * (1 - marginPct / 100);

    const discount = Number(item.discountPercent || item.desiredDiscountPercent || 0);
    const finalPrice = unitPrice * (1 - discount / 100);

    const lineMargin = (finalPrice - unitCost) * qty;

    proposedSubtotal += finalPrice * qty;
    proposedTotalMargin += lineMargin;

    // Standard zero discount baseline
    currentSubtotal += unitPrice * qty;
    currentTotalMargin += (unitPrice - unitCost) * qty;
  }

  const marginLost = Math.max(0, currentTotalMargin - proposedTotalMargin);
  const marginReductionPercent = currentTotalMargin > 0 ? Number(((marginLost / currentTotalMargin) * 100).toFixed(1)) : 0;

  let warning = null;
  if (marginReductionPercent >= 20) {
    warning = `⚠ This discount reduces expected margin by ${marginReductionPercent}%.`;
  }

  return {
    baselineMargin: Number(currentTotalMargin.toFixed(2)),
    proposedMargin: Number(proposedTotalMargin.toFixed(2)),
    marginLost: Number(marginLost.toFixed(2)),
    marginReductionPercent,
    warning
  };
};

/**
 * 5. APPROVAL SIMULATOR
 */
const simulateApprovalChain = async (items, customerId) => {
  const riskAnalysis = await calculateBlendedDiscountRisk({ items, customerId });

  let approvalChain = [];
  if (riskAnalysis.riskLevel === 'HIGH') {
    approvalChain = ['SALES_MANAGER', 'FINANCE_OPERATIONS', 'SALES_MANAGER_FINAL'];
  } else if (riskAnalysis.riskLevel === 'MEDIUM') {
    approvalChain = ['SALES_MANAGER'];
  } else {
    approvalChain = ['NONE'];
  }

  let maxDisc = 0;
  if (items && Array.isArray(items)) {
    items.forEach(i => {
      const d = Number(i.discountPercent || i.desiredDiscountPercent || 0);
      if (d > maxDisc) maxDisc = d;
    });
  }

  return {
    discountPercent: maxDisc,
    riskScore: riskAnalysis.riskScore,
    riskLevel: riskAnalysis.riskLevel,
    managerApprovalRequired: riskAnalysis.managerApprovalRequired,
    financeReviewRequired: riskAnalysis.financeReviewRequired,
    approvalChain,
    riskReasons: riskAnalysis.riskReasons
  };
};

/**
 * 6. NEGOTIATION HEAT METER
 */
const getNegotiationHeat = async (quotationId) => {
  if (!quotationId || !mongoose.Types.ObjectId.isValid(quotationId)) {
    return { level: 'LOW', label: '🟢 LOW', reasons: ['No active negotiation thread'] };
  }

  const negotiation = await Negotiation.findOne({ quotation: quotationId });
  if (!negotiation) {
    return { level: 'LOW', label: '🟢 LOW', reasons: ['No counter-offer activity recorded'] };
  }

  const messageCount = negotiation.messages ? negotiation.messages.length : 0;
  const historyCount = negotiation.history ? negotiation.history.length : 0;
  const totalRounds = messageCount + historyCount;

  let level = 'LOW';
  let label = '🟢 LOW';
  const reasons = [];

  if (totalRounds >= 5) {
    level = 'HIGH';
    label = '🔴 HIGH';
    reasons.push(`${totalRounds} counter-offer rounds exchanged`);
    reasons.push('High negotiation duration & multiple counter-proposals');
  } else if (totalRounds >= 3) {
    level = 'SENSITIVE';
    label = '🟡 SENSITIVE';
    reasons.push(`${totalRounds} negotiation messages exchanged`);
    reasons.push('Moderate price sensitivity and negotiation friction');
  } else {
    reasons.push('Standard single-round inquiry');
  }

  return { level, label, reasons, totalRounds };
};

/**
 * 7. CUSTOMER NEGOTIATION MEMORY
 */
const getCustomerNegotiationMemory = async (customerId) => {
  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
    return { hasData: false, message: 'Not enough historical data' };
  }

  const pastQuotations = await Quotation.find({
    customer: customerId,
    status: { $in: ['Closed', 'Approved', 'Confirmed', 'Customer_Accepted'] }
  }).populate('items.product');

  if (!pastQuotations || pastQuotations.length === 0) {
    return { hasData: false, message: 'Not enough historical data' };
  }

  let minDisc = 100;
  let maxDisc = 0;
  let totalDiscounts = 0;
  let discountCount = 0;
  let lastAcceptedDiscount = 0;
  const productCountMap = {};

  pastQuotations.forEach(q => {
    if (q.acceptedAt || q.status === 'Closed') {
      q.items.forEach(i => {
        const d = i.discountPercent || 0;
        if (d < minDisc) minDisc = d;
        if (d > maxDisc) maxDisc = d;
        totalDiscounts += d;
        discountCount++;
        lastAcceptedDiscount = d;

        const prodName = i.product?.name || 'Product';
        productCountMap[prodName] = (productCountMap[prodName] || 0) + i.quantity;
      });
    }
  });

  if (discountCount === 0) {
    return { hasData: false, message: 'Not enough historical data' };
  }

  const preferredProducts = Object.entries(productCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => e[0]);

  return {
    hasData: true,
    previousNegotiationsCount: pastQuotations.length,
    typicalDiscountRange: `${minDisc}% – ${maxDisc}%`,
    averageCounterRounds: Math.round(pastQuotations.length * 1.2),
    lastAcceptedDiscount: `${lastAcceptedDiscount}%`,
    preferredProducts
  };
};

/**
 * 8. SMART WAREHOUSE PROMISE DATE
 */
const getSmartWarehousePromise = async (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { deliveryPromise: [], completeDeliveryDate: new Date().toISOString() };
  }

  const deliveryPromise = [];
  let maxDays = 2;

  for (const item of items) {
    const prodId = item.product?._id || item.product;
    const product = (item.product && item.product.name) ? item.product : await Product.findById(prodId);
    const prodName = product?.name || 'Product';

    const inventories = await Inventory.find({ product: prodId }).populate('warehouse');
    let neededQty = Number(item.quantity) || 1;

    const splits = [];

    for (const inv of inventories) {
      if (neededQty <= 0) break;
      const available = Math.max(0, inv.stockQuantity - inv.reservedQuantity);
      if (available > 0) {
        const allocated = Math.min(neededQty, available);
        neededQty -= allocated;

        const whName = inv.warehouse?.name || 'Primary Warehouse';
        let estDays = whName.includes('Delhi') ? 2 : (whName.includes('Bengaluru') ? 4 : 3);
        if (estDays > maxDays) maxDays = estDays;

        const expectedDate = new Date(Date.now() + estDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        splits.push({
          warehouse: whName,
          quantity: allocated,
          expectedDate
        });
      }
    }

    if (neededQty > 0) {
      maxDays = Math.max(maxDays, 7);
      const backorderDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      splits.push({
        warehouse: 'Backorder Reserve',
        quantity: neededQty,
        expectedDate: backorderDate
      });
    }

    deliveryPromise.push({
      product: prodName,
      requestedQuantity: item.quantity,
      splits
    });
  }

  const completeDeliveryDate = new Date(Date.now() + maxDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return {
    deliveryPromise,
    completeDeliveryDate
  };
};

/**
 * 9. DEAL RESCUE CENTER (🚨 Deals Needing Attention)
 */
const getDealsNeedingAttention = async (user) => {
  const rescueDeals = [];
  const seenIds = new Set();

  if (!user) return rescueDeals;

  const role = user.role;
  const userId = user._id;

  let approvalFilter = { currentStep: { $nin: ['COMPLETED', 'REJECTED'] } };
  let quotationFilter = { status: { $in: ['Draft', 'Pending Approval', 'Negotiation', 'Approved'] } };
  let negotiationFilter = { status: { $in: ['Open', 'Active', 'Re-approval Required', 'PENDING_MANAGER_APPROVAL'] } };
  let customerRequestFilter = { status: { $in: ['Escalated_Manager', 'WAITING_FOR_FINANCE', 'Pending', 'Negotiation_Required'] } };

  if (role === 'SALES_REP') {
    approvalFilter.salesRep = userId;
    quotationFilter.salesRep = userId;
    negotiationFilter.salesRep = userId;
    customerRequestFilter.assignedSalesRep = userId;
  } else if (role === 'SALES_MANAGER') {
    const User = require('../models/User');
    const teamReps = await User.find({ salesManagerId: userId }).select('_id');
    const repIds = [userId, ...teamReps.map(r => r._id)];

    approvalFilter.$or = [
      { salesManager: userId },
      { salesRep: { $in: repIds } }
    ];
    quotationFilter.salesRep = { $in: repIds };
    negotiationFilter.$or = [
      { salesManager: userId },
      { salesRep: { $in: repIds } }
    ];
    customerRequestFilter.$or = [
      { assignedSalesRep: { $in: repIds } },
      { status: { $in: ['Escalated_Manager', 'WAITING_FOR_FINANCE'] } }
    ];
  } else if (role === 'FINANCE_OPERATIONS') {
    approvalFilter.riskLevel = 'HIGH';
    quotationFilter.riskLevel = 'HIGH';
    customerRequestFilter.status = 'WAITING_FOR_FINANCE';
  } else if (role === 'CUSTOMER') {
    let custId = user.customerId?._id || user.customerId;
    if (!custId) {
      const cust = await Customer.findOne({ email: user.email });
      if (cust) custId = cust._id;
    }
    if (!custId) return [];

    approvalFilter.customer = custId;
    quotationFilter.customer = custId;
    negotiationFilter.customer = custId;
    customerRequestFilter.customer = custId;
  }

  // 1. Pending Approvals
  const pendingApprovals = await Approval.find(approvalFilter)
    .populate('quotation')
    .populate('customerRequest')
    .populate('customer');

  for (const app of pendingApprovals) {
    const recordId = app.quotation?._id || app.customerRequest?._id || app._id;
    const recordIdStr = recordId ? recordId.toString() : app._id.toString();
    if (seenIds.has(recordIdStr)) continue;
    seenIds.add(recordIdStr);

    const recordNum = app.quotation?.quoteNumber || app.customerRequest?.requestNumber || `Approval #${app._id.toString().slice(-4)}`;
    const ageHours = app.createdAt ? Math.floor((Date.now() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60)) : 0;
    const isDelayed = ageHours >= 48;

    rescueDeals.push({
      id: app._id,
      recordId: recordId,
      approvalId: app._id,
      recordType: app.quotation ? 'Quotation' : 'CustomerRequest',
      title: `Deal ${recordNum}`,
      issue: isDelayed ? `Approval delayed (${ageHours}h)` : 'Pending Approval Signoff',
      actionLabel: 'Review Approval',
      severity: isDelayed ? 'HIGH' : 'MEDIUM'
    });
  }

  // 2. High & Medium Risk Active Quotations
  const activeQuotes = await Quotation.find(quotationFilter).populate('customer');

  for (const q of activeQuotes) {
    const qIdStr = q._id.toString();
    if (seenIds.has(qIdStr)) continue;

    if (q.riskLevel === 'HIGH' || q.riskLevel === 'MEDIUM') {
      seenIds.add(qIdStr);
      rescueDeals.push({
        id: q._id,
        recordId: q._id,
        recordType: 'Quotation',
        title: `Deal ${q.quoteNumber}`,
        issue: `Discount Risk (${q.riskLevel} - Score ${q.riskScore})`,
        actionLabel: 'Review Quote',
        severity: q.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
      });
    }
  }

  // 3. Active Customer Negotiations
  const activeNegs = await Negotiation.find(negotiationFilter)
    .populate('quotation')
    .populate('customerRequest');

  for (const neg of activeNegs) {
    const recordId = neg.quotation?._id || neg.customerRequest?._id || neg._id;
    const recordIdStr = recordId ? recordId.toString() : neg._id.toString();
    if (seenIds.has(recordIdStr)) continue;
    seenIds.add(recordIdStr);

    const recordNum = neg.quotation?.quoteNumber || neg.customerRequest?.requestNumber || `Negotiation #${neg._id.toString().slice(-4)}`;
    rescueDeals.push({
      id: neg._id,
      recordId: recordId,
      recordType: neg.quotation ? 'Quotation' : 'CustomerRequest',
      title: `Deal ${recordNum}`,
      issue: 'Active Negotiation Awaiting Response',
      actionLabel: 'Open Negotiation',
      severity: 'MEDIUM'
    });
  }

  // 4. Escalated Customer Requests
  const escalatedRequests = await CustomerRequest.find(customerRequestFilter);

  for (const reqDoc of escalatedRequests) {
    const reqIdStr = reqDoc._id.toString();
    if (seenIds.has(reqIdStr)) continue;
    seenIds.add(reqIdStr);

    rescueDeals.push({
      id: reqDoc._id,
      recordId: reqDoc._id,
      recordType: 'CustomerRequest',
      title: `Request ${reqDoc.requestNumber}`,
      issue: `Customer Request ${reqDoc.status.replace('_', ' ')}`,
      actionLabel: 'Review Request',
      severity: reqDoc.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
    });
  }

  return rescueDeals.slice(0, 10);
};

module.exports = {
  getDealRiskRadar,
  getDealHealthScore,
  getBestCounterOffer,
  calculateProfitProtection,
  simulateApprovalChain,
  getNegotiationHeat,
  getCustomerNegotiationMemory,
  getSmartWarehousePromise,
  getDealsNeedingAttention
};
