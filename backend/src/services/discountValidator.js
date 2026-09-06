const DiscountTier = require('../models/DiscountTier');
const CategoryLimit = require('../models/CategoryLimit');
const Customer = require('../models/Customer');

/**
 * Validates quotation items against Customer Tier limits & Category limits
 * @param {Array} items - List of quotation items
 * @param {String} customerId - Customer ID
 * @returns {Object} { processedItems, totalBreaches, breachSummary }
 */
const validateQuotationDiscounts = async (items, customerId) => {
  // Fetch Customer
  const customer = await Customer.findById(customerId);
  const customerTierName = customer ? customer.tier : 'Iron';

  // Fetch Tiers & Limits from DB (or use defaults if DB empty)
  const tierConfig = await DiscountTier.findOne({ tier: customerTierName });
  const tierLimit = tierConfig ? tierConfig.maxDiscountPercentage : (customerTierName === 'Gold' ? 15 : customerTierName === 'Silver' ? 10 : customerTierName === 'Bronze' ? 5 : 3);

  const categoryLimits = await CategoryLimit.find();
  const categoryMap = {};
  categoryLimits.forEach(c => {
    categoryMap[c.category] = c.maxDiscountPercentage;
  });

  // Default fallbacks if not configured
  const defaultCategoryMap = {
    'Hardware': 15,
    'Services': 10,
    'Software': 20
  };

  let totalBreaches = 0;
  const breachSummary = [];

  const processedItems = items.map(item => {
    const discount = Number(item.discountPercent || 0);
    const category = item.category || (item.product && item.product.category) || 'Hardware';

    // The allowed discount is the lower of Customer Tier Limit and Category Limit
    const catLimit = categoryMap[category] !== undefined ? categoryMap[category] : (defaultCategoryMap[category] || 15);
    const allowedDiscount = Math.min(tierLimit, catLimit);

    let approvalRequired = false;
    let breachReason = '';

    if (discount > allowedDiscount) {
      const diff = discount - allowedDiscount;
      approvalRequired = true;
      breachReason = `Discount (${discount}%) exceeds allowed ${customerTierName} tier / ${category} limit (${allowedDiscount}%) by ${diff.toFixed(1)} percentage points.`;
      totalBreaches++;
      breachSummary.push(breachReason);
    }

    const finalUnitPrice = item.unitPrice * (1 - discount / 100);
    const lineTotal = finalUnitPrice * item.quantity;

    return {
      product: item.product._id || item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: discount,
      finalUnitPrice: Number(finalUnitPrice.toFixed(2)),
      lineTotal: Number(lineTotal.toFixed(2)),
      allowedDiscountPercent: allowedDiscount,
      approvalRequired,
      breachReason
    };
  });

  return { processedItems, totalBreaches, breachSummary, customerTierName, tierLimit };
};

module.exports = { validateQuotationDiscounts };
