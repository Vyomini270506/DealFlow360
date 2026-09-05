const CustomerRequest = require('../models/CustomerRequest');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Product = require('../models/Product');
const Quotation = require('../models/Quotation');
const Approval = require('../models/Approval');
const { validateQuotationDiscounts } = require('../services/discountValidator');
const { calculateRiskScore } = require('../services/riskEngine');

// @desc Submit a new Customer Product Request (Automatic Least-Workload Assignment)
// @route POST /api/customer-requests
const createCustomerRequest = async (req, res) => {
  try {
    // 1. Strict Identity Verification: Derive customer strictly from JWT auth session
    if (req.user.role !== 'CUSTOMER' || !req.user.customerId) {
      return res.status(400).json({ message: 'Only authenticated customers can submit product requests' });
    }

    const customerId = req.user.customerId._id || req.user.customerId;
    const customerDoc = await Customer.findById(customerId);
    if (!customerDoc) {
      return res.status(404).json({ message: 'Customer account record not found' });
    }

    const { items, message } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Product request must contain at least one item' });
    }

    // 2. Automatic Least-Workload Sales Representative Assignment Algorithm among Sales Rep A, Sales Rep B, Sales Rep C
    const salesReps = await User.find({ role: 'SALES_REP' });
    if (!salesReps || salesReps.length === 0) {
      return res.status(500).json({ message: 'No active Sales Representatives available for assignment' });
    }

    const activeStatuses = ['Pending', 'Submitted', 'Processing', 'In Review', 'Escalated_Manager', 'Approved_Manager', 'Quotation Sent', 'Quoted'];
    let selectedRep = null;
    let minWorkload = Infinity;

    for (const rep of salesReps) {
      const activeCount = await CustomerRequest.countDocuments({
        assignedSalesRep: rep._id,
        status: { $in: activeStatuses }
      });

      if (activeCount < minWorkload) {
        minWorkload = activeCount;
        selectedRep = rep;
      }
    }

    if (!selectedRep) {
      return res.status(500).json({ message: 'Failed to assign Sales Representative' });
    }

    // Keep Customer document linked to the newly assigned Sales Rep and Manager
    customerDoc.assignedSalesRepresentative = selectedRep._id;
    customerDoc.assignedSalesManager = selectedRep.salesManagerId || null;
    customerDoc.assignmentStatus = 'REP_ASSIGNED';
    customerDoc.assignedAt = new Date();
    await customerDoc.save();

    // 3. Generate Request Number
    const requestCount = await CustomerRequest.countDocuments();
    const requestNumber = `PR-${1000 + requestCount + 1}`;

    // 4. Populate product details and evaluate initial risk
    const processedItems = [];
    let tempItemsForValidator = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      const qty = Number(item.quantity) || 1;
      const discount = Number(item.desiredDiscountPercent) || 0;

      processedItems.push({
        product: product._id,
        quantity: qty,
        desiredDiscountPercent: discount
      });

      tempItemsForValidator.push({
        product: product._id,
        quantity: qty,
        unitPrice: product.unitPrice,
        discountPercent: discount
      });
    }

    const { totalBreaches } = await validateQuotationDiscounts(tempItemsForValidator, customerId);
    let subtotal = 0;
    let totalDiscount = 0;
    tempItemsForValidator.forEach(i => {
      subtotal += i.unitPrice * i.quantity;
      totalDiscount += (i.unitPrice * (i.discountPercent / 100)) * i.quantity;
    });

    const riskAnalysis = await calculateRiskScore({
      items: tempItemsForValidator,
      grandTotal: subtotal - totalDiscount,
      totalBreaches,
      isNegotiationActive: false
    });

    // 5. Create CustomerRequest document
    const customerRequest = new CustomerRequest({
      requestNumber,
      customer: customerId,
      user: req.user._id,
      assignedSalesRep: selectedRep._id,
      items: processedItems,
      message: message || '',
      status: 'Pending',
      riskScore: riskAnalysis.score,
      riskLevel: riskAnalysis.level,
      riskReasons: riskAnalysis.reasons
    });

    await customerRequest.save();

    const populated = await CustomerRequest.findById(customerRequest._id)
      .populate('customer', 'name company tier email')
      .populate('assignedSalesRep', 'name email role phone')
      .populate('items.product', 'name category unitPrice sku');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get Customer Product Requests strictly scoped by authenticated User/Role
// @route GET /api/customer-requests
const getCustomerRequests = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'CUSTOMER') {
      if (!req.user.customerId) {
        return res.json([]);
      }
      const customerId = req.user.customerId._id || req.user.customerId;
      filter.customer = customerId;
    } else if (req.user.role === 'SALES_REP') {
      filter.assignedSalesRep = req.user._id;
    } else if (req.user.role === 'SALES_MANAGER') {
      const teamReps = await User.find({ salesManagerId: req.user._id }).select('_id');
      const repIds = teamReps.map(r => r._id);
      filter.$or = [
        { assignedSalesRep: { $in: repIds } },
        { status: 'Escalated_Manager' }
      ];
    }

    const requests = await CustomerRequest.find(filter)
      .populate('customer', 'name company tier email')
      .populate('assignedSalesRep', 'name email role phone')
      .populate('items.product', 'name category unitPrice sku')
      .sort('-createdAt');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get Customer Product Request by ID with strict ownership validation
// @route GET /api/customer-requests/:id
const getCustomerRequestById = async (req, res) => {
  try {
    const request = await CustomerRequest.findById(req.params.id)
      .populate('customer', 'name company tier email')
      .populate('assignedSalesRep', 'name email role phone')
      .populate('items.product', 'name category unitPrice sku');

    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    if (req.user.role === 'CUSTOMER') {
      const userCustId = req.user.customerId?._id ? req.user.customerId._id.toString() : req.user.customerId?.toString();
      if (!userCustId || request.customer._id.toString() !== userCustId) {
        return res.status(403).json({ message: 'Not authorized to access this customer request' });
      }
    } else if (req.user.role === 'SALES_REP') {
      if (request.assignedSalesRep && request.assignedSalesRep._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this customer request' });
      }
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Representative escalates Medium/High risk request to Sales Manager
// @route POST /api/customer-requests/:id/escalate
const escalateToManager = async (req, res) => {
  try {
    const { escalationReason } = req.body;
    const request = await CustomerRequest.findById(req.params.id).populate('customer');

    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    if (req.user.role === 'SALES_REP' && request.assignedSalesRep.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to escalate this request' });
    }

    request.status = 'Escalated_Manager';
    request.escalationReason = escalationReason || `Escalated for manager signoff due to ${request.riskLevel} risk score.`;
    await request.save();

    res.json({ message: 'Request escalated to Sales Manager successfully', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Manager approves or rejects an escalated request
// @route POST /api/customer-requests/:id/manager-action
const managerAction = async (req, res) => {
  try {
    const { action, comment } = req.body; // action = 'APPROVE' | 'REJECT'
    const request = await CustomerRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    if (action === 'APPROVE') {
      request.status = 'Approved_Manager';
      request.managerComment = comment || 'Approved by Sales Manager.';
    } else {
      request.status = 'Rejected_Manager';
      request.managerComment = comment || 'Rejected by Sales Manager.';
    }

    await request.save();
    res.json({ message: `Request ${action === 'APPROVE' ? 'approved' : 'rejected'} by Sales Manager`, request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Representative creates official Quotation from Customer Product Request
// @route POST /api/customer-requests/:id/create-quotation
const createQuotationFromRequest = async (req, res) => {
  try {
    const request = await CustomerRequest.findById(req.params.id)
      .populate('customer')
      .populate('items.product');

    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    const { items, notes } = req.body;
    const finalItems = items && Array.isArray(items) && items.length > 0 ? items : request.items;

    // Convert items into official quotation item schema
    const formattedItems = [];
    for (const item of finalItems) {
      const prodId = item.product._id || item.product;
      const product = await Product.findById(prodId);
      if (!product) continue;

      const qty = Number(item.quantity);
      const discount = Number(item.desiredDiscountPercent !== undefined ? item.desiredDiscountPercent : item.discountPercent) || 0;
      const unitPrice = product.unitPrice;
      const finalUnitPrice = unitPrice * (1 - discount / 100);
      const lineTotal = finalUnitPrice * qty;

      formattedItems.push({
        product: product._id,
        quantity: qty,
        unitPrice,
        discountPercent: discount,
        finalUnitPrice: Number(finalUnitPrice.toFixed(2)),
        lineTotal: Number(lineTotal.toFixed(2)),
        allowedDiscountPercent: 10
      });
    }

    // Validate discounts & calculate totals
    const { totalBreaches } = await validateQuotationDiscounts(formattedItems, request.customer._id);
    let subtotal = 0;
    let totalDiscount = 0;
    formattedItems.forEach(i => {
      subtotal += i.unitPrice * i.quantity;
      totalDiscount += (i.unitPrice * (i.discountPercent / 100)) * i.quantity;
    });

    const afterDiscount = subtotal - totalDiscount;
    const tax = Number((afterDiscount * 0.18).toFixed(2));
    const grandTotal = Number((afterDiscount + tax).toFixed(2));

    const riskAnalysis = await calculateRiskScore({
      items: formattedItems,
      grandTotal,
      totalBreaches,
      isNegotiationActive: false
    });

    const count = await Quotation.countDocuments();
    const quoteNumber = `Q-${1000 + count + 1}`;

    const quotation = new Quotation({
      quoteNumber,
      customer: request.customer._id,
      customerRequest: request._id,
      salesRep: req.user._id,
      items: formattedItems,
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      tax,
      grandTotal,
      status: 'Approved',
      riskScore: riskAnalysis.score,
      riskLevel: riskAnalysis.level,
      riskReasons: riskAnalysis.reasons,
      approvalChainState: 'APPROVED',
      notes: notes || `Created from Product Request ${request.requestNumber}`
    });

    await quotation.save();

    request.status = 'Quoted';
    request.quotation = quotation._id;
    await request.save();

    res.status(201).json({ quotation, request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCustomerRequest,
  getCustomerRequests,
  getCustomerRequestById,
  escalateToManager,
  managerAction,
  createQuotationFromRequest
};
