const Inventory = require('../models/Inventory');

/**
 * Transparent rule-based risk score engine (0-100)
 * @param {Object} quotationData - Quotation details including items, grandTotal, discounts, customerNegotiation
 * @returns {Object} { score, level, reasons, approvalStep }
 */
const calculateRiskScore = async (quotationData) => {
  let score = 0;
  const reasons = [];

  const { items, grandTotal, totalBreaches, isNegotiationActive } = quotationData;

  // 1. Discount exceeds allowed limit (+40 points)
  if (totalBreaches > 0) {
    score += 40;
    reasons.push(`Discount exceeds allowed limit (+40)`);
  }

  // 2. Very high discount on any item > 25% (+20 points)
  const maxDiscountItem = items.reduce((max, item) => Math.max(max, item.discountPercent || 0), 0);
  if (maxDiscountItem > 25) {
    score += 20;
    reasons.push(`High item discount ${maxDiscountItem}% exceeds 25% (+20)`);
  }

  // 3. Large deal value > 5,000,000 / $50k (+20 points)
  if (grandTotal > 500000) { // ₹5L+ or $50k+
    score += 20;
    reasons.push(`Large deal value ₹${(grandTotal / 100000).toFixed(1)}L (+20)`);
  }

  // 4. Customer negotiation active (+10 points)
  if (isNegotiationActive) {
    score += 10;
    reasons.push(`Active customer negotiation (+10)`);
  }

  // 5. Stock shortage across warehouses (+10 points)
  let stockShortageDetected = false;
  for (const item of items) {
    const productId = item.product._id || item.product;
    const inventories = await Inventory.find({ product: productId });
    const totalAvailable = inventories.reduce((sum, inv) => sum + (inv.stockQuantity - inv.reservedQuantity), 0);
    
    if (totalAvailable < item.quantity) {
      stockShortageDetected = true;
      break;
    }
  }

  if (stockShortageDetected) {
    score += 10;
    reasons.push(`Stock shortage across warehouses (+10)`);
  }

  // Cap score at 100
  score = Math.min(100, Math.max(0, score));

  // Determine Risk Tier
  let level = 'LOW';
  if (score >= 60) {
    level = 'HIGH';
  } else if (score >= 30) {
    level = 'MEDIUM';
  }

  // Determine Required Approval Level:
  // HIGH risk -> requires SALES_MANAGER -> FINANCE_OPERATIONS
  // MEDIUM or LOW risk (with breaches) -> requires SALES_MANAGER
  let requiredApproval = 'NONE';
  if (level === 'HIGH') {
    requiredApproval = 'SALES_MANAGER'; // First step is Manager, then Finance
  } else if (score > 0 || totalBreaches > 0) {
    requiredApproval = 'SALES_MANAGER';
  }

  return {
    score,
    level,
    reasons,
    requiredApproval
  };
};

module.exports = { calculateRiskScore };
