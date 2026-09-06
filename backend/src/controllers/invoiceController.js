const Invoice = require('../models/Invoice');
const Fulfillment = require('../models/Fulfillment');
const Quotation = require('../models/Quotation');
const Customer = require('../models/Customer');

// @desc Get all invoices with strict RBAC scoping
// @route GET /api/invoices
const getInvoices = async (req, res) => {
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

    const invoices = await Invoice.find(filter)
      .populate('customer', 'name company email tier')
      .populate('salesRep', 'name email role')
      .populate('quotation', 'quoteNumber status')
      .populate('subscription', 'subscriptionNumber planName billingFrequency')
      .populate('items.product', 'name sku category type')
      .sort('-createdAt');

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single invoice detail
// @route GET /api/invoices/:id
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('salesRep', 'name email role')
      .populate('quotation')
      .populate('subscription')
      .populate('fulfillment')
      .populate('items.product');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (req.user.role === 'CUSTOMER') {
      const userCustId = req.user.customerId?._id ? req.user.customerId._id.toString() : req.user.customerId?.toString();
      if (!userCustId || invoice.customer._id.toString() !== userCustId) {
        return res.status(403).json({ message: 'Not authorized to view this invoice' });
      }
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Generate invoice from fulfillment (Reconciliation Guard: Only bill shipped items)
// @route POST /api/invoices/generate/:fulfillmentId
const generateInvoice = async (req, res) => {
  try {
    const fulfillment = await Fulfillment.findById(req.params.fulfillmentId)
      .populate('quotation')
      .populate('items.product');

    if (!fulfillment) {
      return res.status(404).json({ message: 'Fulfillment record not found' });
    }

    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${2000 + count + 1}`;

    const invoiceItems = [];
    let subtotal = 0;

    for (const item of fulfillment.items) {
      if (item.fulfilledQuantity > 0) {
        const quoteItem = fulfillment.quotation.items.find(
          qi => qi.product.toString() === item.product._id.toString()
        );
        const unitPrice = quoteItem ? quoteItem.finalUnitPrice : item.product.unitPrice;
        const lineTotal = Number((unitPrice * item.fulfilledQuantity).toFixed(2));

        subtotal += lineTotal;

        invoiceItems.push({
          product: item.product._id,
          shippedQuantity: item.fulfilledQuantity,
          unitPrice,
          lineTotal
        });
      }
    }

    if (invoiceItems.length === 0) {
      return res.status(400).json({ message: 'Cannot generate invoice: No items have been fulfilled/shipped yet' });
    }

    const tax = Number((subtotal * 0.18).toFixed(2));
    const grandTotal = Number((subtotal + tax).toFixed(2));

    const invoice = new Invoice({
      invoiceNumber,
      quotation: fulfillment.quotation._id,
      fulfillment: fulfillment._id,
      customer: fulfillment.customer,
      salesRep: fulfillment.quotation.salesRep,
      type: 'ONE_TIME',
      items: invoiceItems,
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      grandTotal,
      paymentStatus: 'UNPAID',
      deliveryStatus: fulfillment.status === 'Fulfilled' ? 'SHIPPED' : 'PARTIALLY_SHIPPED',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      reconciliationNotes: `Partial delivery reconciliation. Billed ${invoiceItems.length} shipped items.`
    });

    await invoice.save();

    const isFullyShipped = fulfillment.status === 'Fulfilled';
    fulfillment.quotation.status = isFullyShipped ? 'Completed' : 'Fulfillment';
    await fulfillment.quotation.save();

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Record Payment for Invoice
// @route POST /api/invoices/:id/payment
const recordPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const newAmountPaid = (invoice.amountPaid || 0) + Number(amount);
    invoice.amountPaid = newAmountPaid;

    if (newAmountPaid >= invoice.grandTotal) {
      invoice.paymentStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      invoice.paymentStatus = 'PARTIALLY_PAID';
    }

    await invoice.save();

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getInvoices, getInvoiceById, generateInvoice, recordPayment };
