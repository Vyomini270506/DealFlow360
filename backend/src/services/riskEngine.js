const Product = require('../models/Product');
const Customer = require('../models/Customer');
const DiscountTier = require('../models/DiscountTier');
const CategoryLimit = require('../models/CategoryLimit');

/**
 * UNIVERSAL RISK CALCULATION — ONE SOURCE OF TRUTH
 * Blended Discount Risk Formula across ALL items in a request or quotation.
 * 
 * Formula:
 * For every line:
 *   Allowed Discount = MIN(Customer Tier Discount Limit, Product/Category Discount Limit)
 *   Line Excess = MAX(0, Given Discount - Allowed Discount)
 * 
 * Risk Score = SUM(Line Excess for every quotation line)
 * 
 * Approval Requirements / Centralized Threshold Configuration:
 *   Score = 0    -> Risk Level = LOW    | managerApprovalRequired: false | financeReviewRequired: false
 *   Score 1-5    -> Risk Level = MEDIUM | managerApprovalRequired: true  | financeReviewRequired: false
 *   Score > 5    -> Risk Level = HIGH   | managerApprovalRequired: true  | financeReviewRequired: true
 * 
 * @param {Object} params
 * @param {Array} params.items - Array of items [{ product, quantity, discountPercent || desiredDiscountPercent }]
 * @param {String|Object} params.customerId - Customer ID or customer document
 * @returns {Promise<Object>} { riskScore, riskLevel, managerApprovalRequired, approvalRequired, financeReviewRequired, riskFactors, riskReasons }
 */
const calculateBlendedDiscountRisk = async ({ items, customerId }) => {
  let blendedRiskScore = 0;
  const riskFactors = [];
  const riskReasons = [];
  let totalBreaches = 0;

  // 1. Determine Customer Tier from MongoDB
  let customerTier = 'Bronze';
  if (customerId) {
    let custDoc = customerId;
    if (typeof customerId === 'string' || (customerId && !customerId.tier)) {
      custDoc = await Customer.findById(customerId);
    }
    if (custDoc && custDoc.tier) {
      customerTier = custDoc.tier;
    }
  }

  // 2. Determine Customer Tier Limit from MongoDB DiscountTier model
  const tierDoc = await DiscountTier.findOne({ tier: customerTier });
  const tierDefaults = { Iron: 3, Bronze: 5, Silver: 10, Gold: 15 };
  const customerTierLimit = tierDoc ? tierDoc.maxDiscountPercentage : (tierDefaults[customerTier] || 5);

  // 3. Fetch Category Limits Map from MongoDB CategoryLimit model
  const catDocs = await CategoryLimit.find();
  const catLimitMap = {};
  catDocs.forEach(c => { catLimitMap[c.category] = c.maxDiscountPercentage; });
  const catDefaults = { Hardware: 15, Services: 10, Software: 20 };

  // 4. Calculate Line Excess across EVERY quotation item
  if (items && Array.isArray(items)) {
    for (const item of items) {
      const prodId = item.product?._id || item.product;
      let productDoc = (item.product && typeof item.product === 'object' && item.product.name) ? item.product : null;
      if (!productDoc && prodId) {
        productDoc = await Product.findById(prodId);
      }

      const prodName = productDoc?.name || 'Product';
      const prodSku = productDoc?.sku || '';
      const prodCategory = productDoc?.category || 'Hardware';

      const categoryLimit = catLimitMap[prodCategory] !== undefined 
        ? catLimitMap[prodCategory] 
        : (catDefaults[prodCategory] || 15);

      // Allowed Discount = MIN(Customer Tier Discount Limit, Product/Category Discount Limit)
      const allowedDiscount = Math.min(customerTierLimit, categoryLimit);

      // Given Discount
      const givenDiscount = Number(
        item.discountPercent !== undefined 
          ? item.discountPercent 
          : (item.desiredDiscountPercent !== undefined ? item.desiredDiscountPercent : 0)
      ) || 0;

      // Line Excess = MAX(0, Given Discount - Allowed Discount)
      const excess = Math.max(0, givenDiscount - allowedDiscount);

      blendedRiskScore += excess;

      if (excess > 0) {
        totalBreaches++;
        riskFactors.push({
          product: prodName,
          productSku: prodSku,
          givenDiscount,
          allowedDiscount,
          excess,
          customerTierLimit,
          categoryLimit
        });
        riskReasons.push(
          `${prodName}: Given discount ${givenDiscount}% exceeds allowed limit ${allowedDiscount}% (Customer Tier ${customerTier}: ${customerTierLimit}%, Category ${prodCategory}: ${categoryLimit}%) -> Excess: ${excess}%`
        );
      }
    }
  }

  // Round score to 2 decimal places
  blendedRiskScore = Number(blendedRiskScore.toFixed(2));

  // 5. Centralized Threshold Conversion
  // Score = 0 -> No approval
  // Score 1-5 -> Manager approval
  // Score > 5 -> Manager + Finance review
  let riskLevel = 'LOW';
  let managerApprovalRequired = false;
  let financeReviewRequired = false;

  if (blendedRiskScore > 5) {
    riskLevel = 'HIGH';
    managerApprovalRequired = true;
    financeReviewRequired = true;
  } else if (blendedRiskScore > 0) {
    riskLevel = 'MEDIUM';
    managerApprovalRequired = true;
    financeReviewRequired = false;
  }

  if (riskReasons.length === 0) {
    riskReasons.push('All line discounts are within authorized customer tier and category limits.');
  }

  return {
    riskScore: blendedRiskScore,
    riskLevel,
    managerApprovalRequired,
    approvalRequired: managerApprovalRequired,
    financeReviewRequired,
    riskFactors,
    riskReasons,
    totalBreaches,
    score: blendedRiskScore,
    level: riskLevel,
    reasons: riskReasons
  };
};

const calculateRiskScore = calculateBlendedDiscountRisk;

module.exports = { 
  calculateBlendedDiscountRisk, 
  calculateRiskScore 
};
