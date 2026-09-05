const Subscription = require('../models/Subscription');

// @desc Get subscriptions
// @route GET /api/subscriptions
const getSubscriptions = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'CUSTOMER' && req.user.customerId) {
      filter.customer = req.user.customerId._id || req.user.customerId;
    }

    const subscriptions = await Subscription.find(filter)
      .populate('customer', 'name company tier email')
      .populate('product', 'name category unitPrice')
      .sort('-createdAt');

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create subscription
// @route POST /api/subscriptions
const createSubscription = async (req, res) => {
  try {
    const { customerId, productId, planName, billingCycle, amount } = req.body;

    const count = await Subscription.countDocuments();
    const subscriptionNumber = `SUB-${3000 + count + 1}`;

    const subscription = new Subscription({
      subscriptionNumber,
      customer: customerId,
      product: productId,
      planName,
      billingCycle: billingCycle || 'Monthly',
      amount,
      status: 'Active',
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + (billingCycle === 'Yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      billingHistory: [{
        invoiceNumber: `SUB-INV-${100 + count}`,
        date: new Date(),
        amount,
        status: 'Paid'
      }]
    });

    await subscription.save();

    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update subscription status (Active / Paused / Cancelled)
// @route PUT /api/subscriptions/:id/status
const updateSubscriptionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    subscription.status = status;
    if (status === 'Cancelled') {
      subscription.endDate = new Date();
    }

    await subscription.save();

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getSubscriptions, createSubscription, updateSubscriptionStatus };
