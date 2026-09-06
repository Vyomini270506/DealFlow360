const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');

// @desc Get subscriptions with strict RBAC scoping
// @route GET /api/subscriptions
const getSubscriptions = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'CUSTOMER') {
      if (!req.user.customerId) return res.json([]);
      const customerId = req.user.customerId._id || req.user.customerId;
      filter.customer = customerId;
    } else if (req.user.role === 'SALES_REP') {
      const myCustomers = await Customer.find({ assignedSalesRepresentative: req.user._id }).select('_id');
      const custIds = myCustomers.map(c => c._id);
      filter.$or = [
        { salesRep: req.user._id },
        { customer: { $in: custIds } }
      ];
    }

    const subscriptions = await Subscription.find(filter)
      .populate('customer', 'name company tier email')
      .populate('salesRep', 'name email role')
      .populate('product', 'name category unitPrice sku type')
      .populate('quotation', 'quoteNumber grandTotal')
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
    const { customerId, salesRepId, quotationId, productId, planName, billingCycle, amount } = req.body;

    const count = await Subscription.countDocuments();
    const subscriptionNumber = `SUB-${3000 + count + 1}`;

    const subscription = new Subscription({
      subscriptionNumber,
      customer: customerId,
      salesRep: salesRepId || null,
      quotation: quotationId || null,
      product: productId,
      planName: planName || 'Recurring Service Agreement',
      billingCycle: billingCycle || 'Monthly',
      billingFrequency: billingCycle || 'Monthly',
      amount,
      status: 'ACTIVE',
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + (billingCycle === 'Yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
      billingHistory: []
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
    if (status === 'Cancelled' || status === 'CANCELLED') {
      subscription.endDate = new Date();
    }

    await subscription.save();

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Demo Recurring Billing Trigger: Generate next billing invoice for a subscription
// @route POST /api/subscriptions/:id/generate-invoice
const generateNextBillingInvoice = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('customer')
      .populate('product');

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription record not found' });
    }

    if (subscription.status === 'Cancelled' || subscription.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot generate invoice for a cancelled subscription' });
    }

    const invCount = await Invoice.countDocuments();
    const invoiceNumber = `SUB-INV-${1000 + invCount + 1}`;

    const subtotal = Number(subscription.amount.toFixed(2));
    const tax = Number((subtotal * 0.18).toFixed(2));
    const grandTotal = Number((subtotal + tax).toFixed(2));

    const invoice = await Invoice.create({
      invoiceNumber,
      subscription: subscription._id,
      quotation: subscription.quotation || null,
      customer: subscription.customer._id || subscription.customer,
      salesRep: subscription.salesRep || null,
      type: 'RECURRING',
      items: [{
        product: subscription.product._id || subscription.product,
        shippedQuantity: 1,
        unitPrice: subscription.amount,
        lineTotal: subscription.amount
      }],
      subtotal,
      tax,
      grandTotal,
      paymentStatus: 'UNPAID',
      deliveryStatus: 'DELIVERED',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Net 15 days for recurring
      reconciliationNotes: `Recurring billing invoice for ${subscription.planName || 'Service Subscription'}.`
    });

    // Append to subscription billing history
    subscription.billingHistory.push({
      invoiceNumber,
      date: new Date(),
      amount: grandTotal,
      status: 'UNPAID'
    });

    // Advance next billing date by 30 days
    const currentNext = subscription.nextBillingDate ? new Date(subscription.nextBillingDate) : new Date();
    subscription.nextBillingDate = new Date(currentNext.getTime() + 30 * 24 * 60 * 60 * 1000);

    await subscription.save();

    res.status(201).json({
      message: 'Next billing invoice generated successfully!',
      invoice,
      subscription
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Cancel Subscription (Preserves all previous invoices and history)
// @route POST /api/subscriptions/:id/cancel
const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription record not found' });
    }

    subscription.status = 'CANCELLED';
    subscription.endDate = new Date();
    await subscription.save();

    res.json({
      message: 'Subscription cancelled successfully. All historical invoices remain preserved.',
      subscription
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSubscriptions,
  createSubscription,
  updateSubscriptionStatus,
  generateNextBillingInvoice,
  cancelSubscription
};
