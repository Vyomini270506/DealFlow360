const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const CreditNote = require('../models/CreditNote');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const Fulfillment = require('../models/Fulfillment');
const Backorder = require('../models/Backorder');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');
const Customer = require('../models/Customer');
const { logAudit } = require('../services/auditService');

// Helper to compute and synchronize exact backend payment status
const computePaymentStatus = (invoice) => {
  const paid = invoice.amountPaid || 0;
  const total = invoice.grandTotal || 0;
  const isPastDue = invoice.dueDate && new Date(invoice.dueDate) < new Date();

  if (paid >= total && total > 0) {
    return 'PAID';
  } else if (paid > 0 && paid < total) {
    return isPastDue ? 'OVERDUE' : 'PARTIALLY_PAID';
  } else if (paid === 0) {
    return isPastDue ? 'OVERDUE' : 'UNPAID';
  }
  return 'UNPAID';
};

// desc Get overview financial metrics calculated strictly from MongoDB
// route GET /api/finance/overview
const getFinanceOverviewMetrics = async (req, res) => {
  try {
    const invoices = await Invoice.find();

    let totalInvoiced = 0;
    let totalCollected = 0;
    let outstandingAmount = 0;
    let overdueAmount = 0;

    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let overdueCount = 0;

    const now = new Date();

    for (const inv of invoices) {
      const grandTotal = inv.grandTotal || 0;
      const amountPaid = inv.amountPaid || 0;
      const remaining = Math.max(0, grandTotal - amountPaid);
      const status = computePaymentStatus(inv);

      totalInvoiced += grandTotal;
      totalCollected += amountPaid;
      outstandingAmount += remaining;

      if (status === 'PAID') {
        paidCount++;
      } else if (status === 'PARTIALLY_PAID') {
        partialCount++;
      } else if (status === 'OVERDUE') {
        overdueCount++;
        overdueAmount += remaining;
      } else {
        unpaidCount++;
      }
    }

    const recentPayments = await Payment.find()
      .populate('customer', 'name company email')
      .populate('invoice', 'invoiceNumber grandTotal')
      .populate('recordedBy', 'name email')
      .sort('-paymentDate')
      .limit(10);

    res.json({
      totalInvoiced,
      totalCollected,
      outstandingAmount,
      overdueAmount,
      counts: {
        totalInvoices: invoices.length,
        paid: paidCount,
        partiallyPaid: partialCount,
        unpaid: unpaidCount,
        overdue: overdueCount
      },
      recentPayments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get invoices categorized by payment status with computed backend state
// @route GET /api/finance/invoices
const getInvoices = async (req, res) => {
  try {
    const { status, search } = req.query;

    const invoices = await Invoice.find()
      .populate('customer', 'name company email tier')
      .populate('salesRep', 'name email')
      .populate('quotation', 'quoteNumber status')
      .populate('subscription', 'subscriptionNumber planName')
      .sort('-createdAt');

    // Synchronize computed payment status on each document
    const processedInvoices = [];
    for (const inv of invoices) {
      const currentComputedStatus = computePaymentStatus(inv);
      if (inv.paymentStatus !== currentComputedStatus) {
        inv.paymentStatus = currentComputedStatus;
        await inv.save();
      }

      const invObj = inv.toObject();
      invObj.remainingBalance = Math.max(0, (inv.grandTotal || 0) - (inv.amountPaid || 0));
      invObj.computedStatus = currentComputedStatus;

      processedInvoices.push(invObj);
    }

    let filtered = processedInvoices;

    if (status && status !== 'ALL') {
      filtered = filtered.filter(i => i.computedStatus === status || i.paymentStatus === status);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        (i.customer && (i.customer.company?.toLowerCase().includes(q) || i.customer.name?.toLowerCase().includes(q)))
      );
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Record payment for an invoice with payment reconciliation
// @route POST /api/finance/payments
const recordPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod, transactionReference, notes, paymentDate } = req.body;

    if (!invoiceId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Valid invoice ID and positive payment amount are required' });
    }

    const invoice = await Invoice.findById(invoiceId).populate('customer');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check duplicate transaction reference if provided
    if (transactionReference && transactionReference.trim() !== '') {
      const existingPayment = await Payment.findOne({ transactionReference: transactionReference.trim() });
      if (existingPayment) {
        return res.status(400).json({ message: `Payment with transaction reference '${transactionReference}' has already been recorded.` });
      }
    }

    const payAmount = Number(amount);
    const currentPaid = invoice.amountPaid || 0;
    const grandTotal = invoice.grandTotal || 0;
    const remaining = Math.max(0, grandTotal - currentPaid);

    if (payAmount > remaining + 0.01) {
      return res.status(400).json({ 
        message: `Payment amount (₹${payAmount.toLocaleString()}) exceeds remaining invoice balance (₹${remaining.toLocaleString()}).` 
      });
    }

    // Generate Payment Number
    const count = await Payment.countDocuments();
    const paymentNumber = `PAY-${10000 + count + 1}`;

    const payment = new Payment({
      paymentNumber,
      invoice: invoice._id,
      customer: invoice.customer._id || invoice.customer,
      amount: payAmount,
      paymentMethod: paymentMethod || 'BANK_TRANSFER',
      transactionReference: transactionReference ? transactionReference.trim() : `REF-${Date.now()}`,
      paymentDate: paymentDate || new Date(),
      notes: notes || '',
      recordedBy: req.user._id
    });

    await payment.save();

    // Reconcile invoice amountPaid from actual Payment aggregation
    const aggResult = await Payment.aggregate([
      { $match: { invoice: invoice._id } },
      { $group: { _id: null, totalPaid: { $sum: '$amount' } } }
    ]);

    const aggregatedTotalPaid = aggResult.length > 0 ? aggResult[0].totalPaid : currentPaid + payAmount;
    invoice.amountPaid = aggregatedTotalPaid;
    invoice.paymentStatus = computePaymentStatus(invoice);
    await invoice.save();

    await logAudit({
      recordType: 'Invoice',
      recordId: invoice._id,
      user: req.user._id,
      role: req.user.role,
      action: 'PAYMENT_RECORDED',
      details: {
        paymentNumber,
        amount: payAmount,
        totalPaid: aggregatedTotalPaid,
        newStatus: invoice.paymentStatus
      }
    });

    res.status(201).json({
      message: 'Payment recorded and reconciled successfully',
      payment,
      invoice
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get payment transaction history
// @route GET /api/finance/payments
const getPaymentsHistory = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('customer', 'name company email tier')
      .populate('invoice', 'invoiceNumber grandTotal paymentStatus')
      .populate('recordedBy', 'name email')
      .sort('-paymentDate');

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create a credit note for financial adjustment
// @route POST /api/finance/credit-notes
const createCreditNote = async (req, res) => {
  try {
    const { invoiceId, amount, reason, description } = req.body;

    if (!invoiceId || !amount || Number(amount) <= 0 || !reason) {
      return res.status(400).json({ message: 'Invoice ID, amount, and reason are required for credit note' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const count = await CreditNote.countDocuments();
    const creditNoteNumber = `CN-${5000 + count + 1}`;

    const creditNote = new CreditNote({
      creditNoteNumber,
      invoice: invoice._id,
      customer: invoice.customer,
      amount: Number(amount),
      reason,
      description: description || '',
      status: 'APPROVED',
      issuedBy: req.user._id,
      issuedAt: new Date()
    });

    await creditNote.save();

    await logAudit({
      recordType: 'Invoice',
      recordId: invoice._id,
      user: req.user._id,
      role: req.user.role,
      action: 'CREDIT_NOTE_ISSUED',
      details: {
        creditNoteNumber,
        amount: Number(amount),
        reason
      }
    });

    res.status(201).json({
      message: 'Credit note created successfully',
      creditNote
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get credit notes history
// @route GET /api/finance/credit-notes
const getCreditNotes = async (req, res) => {
  try {
    const creditNotes = await CreditNote.find()
      .populate('customer', 'name company email')
      .populate('invoice', 'invoiceNumber grandTotal')
      .populate('issuedBy', 'name email')
      .sort('-issuedAt');

    res.json(creditNotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Generate subscription invoice for current billing cycle
// @route POST /api/finance/subscriptions/:id/generate-invoice
const generateSubscriptionInvoice = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('customer')
      .populate('quotation');

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Check for duplicate invoice in the current billing cycle
    const currentMonthYear = new Date().toISOString().slice(0, 7); // e.g. 2026-09
    const existingCycleInvoice = await Invoice.findOne({
      subscription: subscription._id,
      createdAt: {
        $gte: new Date(`${currentMonthYear}-01T00:00:00.000Z`),
        $lte: new Date(`${currentMonthYear}-31T23:59:59.999Z`)
      }
    });

    if (existingCycleInvoice) {
      return res.status(400).json({
        message: `An invoice (${existingCycleInvoice.invoiceNumber}) has already been generated for this subscription for cycle ${currentMonthYear}. Duplicate invoice prevented.`
      });
    }

    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-SUB-${1000 + count + 1}`;

    const newInvoice = new Invoice({
      invoiceNumber,
      subscription: subscription._id,
      quotation: subscription.quotation?._id || subscription.quotation,
      customer: subscription.customer._id || subscription.customer,
      salesRep: subscription.salesRep,
      type: 'SUBSCRIPTION',
      items: [{
        product: subscription.product || subscription.quotation?.items?.[0]?.product,
        shippedQuantity: 1,
        unitPrice: subscription.amount,
        lineTotal: subscription.amount
      }],
      subtotal: subscription.amount,
      tax: Math.round(subscription.amount * 0.18),
      grandTotal: Math.round(subscription.amount * 1.18),
      paymentStatus: 'UNPAID',
      deliveryStatus: 'SHIPPED',
      amountPaid: 0,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });

    await newInvoice.save();

    // Update subscription latest invoice and next billing date
    subscription.latestInvoice = newInvoice._id;
    subscription.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await subscription.save();

    res.status(201).json({
      message: 'Subscription recurring invoice generated successfully',
      invoice: newInvoice,
      subscription
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Financial Reconciliation Alerts & Anomaly Scanner
// @route GET /api/finance/reconciliation-alerts
const getReconciliationAlerts = async (req, res) => {
  try {
    const alerts = [];

    // 1. Invoices marked PAID but actual payments sum < grandTotal
    const invoices = await Invoice.find();
    for (const inv of invoices) {
      const grandTotal = inv.grandTotal || 0;
      const amountPaid = inv.amountPaid || 0;

      const payAgg = await Payment.aggregate([
        { $match: { invoice: inv._id } },
        { $group: { _id: null, sum: { $sum: '$amount' } } }
      ]);
      const actualPaymentSum = payAgg.length > 0 ? payAgg[0].sum : 0;

      if (inv.paymentStatus === 'PAID' && actualPaymentSum < grandTotal) {
        alerts.push({
          type: 'PAYMENT_MISMATCH',
          severity: 'HIGH',
          title: `Invoice ${inv.invoiceNumber} status is PAID but payment is insufficient`,
          details: `Invoice total is ₹${grandTotal.toLocaleString()}, but recorded payments sum to ₹${actualPaymentSum.toLocaleString()}.`
        });
      }

      if (actualPaymentSum > grandTotal) {
        alerts.push({
          type: 'OVERPAYMENT',
          severity: 'MEDIUM',
          title: `Invoice ${inv.invoiceNumber} has overpayment`,
          details: `Recorded payments (₹${actualPaymentSum.toLocaleString()}) exceed invoice grand total (₹${grandTotal.toLocaleString()}).`
        });
      }

      if (inv.dueDate && new Date(inv.dueDate) < new Date() && amountPaid === 0) {
        alerts.push({
          type: 'OVERDUE_UNPAID',
          severity: 'MEDIUM',
          title: `Invoice ${inv.invoiceNumber} is past due with zero payments`,
          details: `Due date was ${new Date(inv.dueDate).toLocaleDateString()}. Outstanding amount: ₹${grandTotal.toLocaleString()}.`
        });
      }
    }

    // 2. Fulfillment Stock Deficits
    const fulfillments = await Fulfillment.find({ status: { $ne: 'Delivered' } }).populate('items.product');
    const backorders = await Backorder.find({ status: 'PENDING' });

    if (backorders.length > 0) {
      alerts.push({
        type: 'STOCK_SHORTAGE',
        severity: 'MEDIUM',
        title: `${backorders.length} Stock Shortage Backorders Pending`,
        details: `Warehouse stock is insufficient for ${backorders.length} order items. Inventory arrival required before fulfillment.`
      });
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFinanceOverviewMetrics,
  getInvoices,
  recordPayment,
  getPaymentsHistory,
  createCreditNote,
  getCreditNotes,
  generateSubscriptionInvoice,
  getReconciliationAlerts
};
