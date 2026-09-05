const Invoice = require('../models/Invoice');
const Fulfillment = require('../models/Fulfillment');
const Quotation = require('../models/Quotation');

// @desc Get all invoices
// @route GET /api/invoices
const getInvoices = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'CUSTOMER' && req.user.customerId) {
      filter.customer = req.user.customerId._id || req.user.customerId;
    }

    const invoices = await Invoice.find(filter)
      .populate('customer', 'name company email')
      .populate('quotation', 'quoteNumber status')
      .populate('items.product', 'name sku category')
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
      .populate('quotation')
      .populate('fulfillment')
      .populate('items.product');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
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

    // RULE: Only bill products that have been shipped/fulfilled (fulfilledQuantity > 0)
    for (const item of fulfillment.items) {
      if (item.fulfilledQuantity > 0) {
        // Find matching line item price from quotation
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
      items: invoiceItems,
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      grandTotal,
      paymentStatus: 'Unpaid',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30 days
      reconciliationNotes: `Partial delivery reconciliation. Billed ${invoiceItems.length} shipped items.`
    });

    await invoice.save();

    // Update Quotation Status
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
      invoice.paymentStatus = 'Paid';
    } else if (newAmountPaid > 0) {
      invoice.paymentStatus = 'Partial';
    }

    await invoice.save();

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getInvoices, getInvoiceById, generateInvoice, recordPayment };
