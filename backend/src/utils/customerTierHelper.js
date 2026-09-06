const Customer = require('../models/Customer');
const Quotation = require('../models/Quotation');
const CustomerRequest = require('../models/CustomerRequest');

/**
/ * Recalculates customer tier based on total confirmed/completed orders
 * 0 orders: Iron (default for new customers)
 * 1-3 orders: Bronze
 * 4-9 orders: Silver
 * 10+ orders: Gold
 */
const updateCustomerTierByOrderCount = async (customerId) => {
  if (!customerId) return null;

  try {
    // Count confirmed / completed quotations
    const quoteCount = await Quotation.countDocuments({
      customer: customerId,
      status: { $in: ['Approved', 'Confirmed', 'Fulfillment', 'Completed', 'Closed'] }
    });

    // Count completed customer requests
    const requestCount = await CustomerRequest.countDocuments({
      customer: customerId,
      status: { $in: ['Completed', 'Closed', 'Quotation Sent', 'Quoted', 'Approved_Manager'] }
    });

    const orderCount = Math.max(quoteCount, requestCount);

    let tier = 'Iron';
    if (orderCount >= 10) {
      tier = 'Gold';
    } else if (orderCount >= 4) {
      tier = 'Silver';
    } else if (orderCount >= 1) {
      tier = 'Bronze';
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { tier },
      { new: true }
    );

    return { orderCount, tier: updatedCustomer ? updatedCustomer.tier : tier };
  } catch (error) {
    console.error(`[Tier Engine] Failed to update customer tier for ${customerId}:`, error.message);
    return null;
  }
};

module.exports = { updateCustomerTierByOrderCount };
