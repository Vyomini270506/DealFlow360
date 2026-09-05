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

    // IDEMPOTENCY CHECK: Prevent accidental duplicate product requests (within 60s or matching pending request)
    const existingRecentRequest = await CustomerRequest.findOne({
      customer: customerId,
      status: 'Pending',
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    }).populate('customer', 'name company tier email')
      .populate('assignedSalesRep', 'name email role phone')
      .populate('items.product', 'name category unitPrice sku');

    if (existingRecentRequest) {
      return res.status(200).json(existingRecentRequest);
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
        { status: { $in: ['Escalated_Manager', 'WAITING_FOR_FINANCE', 'FINANCE_REVIEWED'] } }
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

// @desc Sales Representative directly approves or rejects a LOW risk customer request
// @route POST /api/customer-requests/:id/rep-action
const repActionOnRequest = async (req, res) => {
  try {
    const { action } = req.body; // action: 'APPROVE' | 'REJECT' | 'SEND_TO_MANAGER'
    const request = await CustomerRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    if (req.user.role === 'SALES_REP' && request.assignedSalesRep.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to act on this request' });
    }

    // STRICT BACKEND ENFORCEMENT: MEDIUM & HIGH risk requests CANNOT be independently decided by Sales Rep
    if (request.riskLevel === 'MEDIUM' || request.riskLevel === 'HIGH') {
      if (action === 'APPROVE' || action === 'REJECT') {
        return res.status(403).json({
          message: `Sales Representative cannot independently decide on ${request.riskLevel} risk requests. Sales Manager approval is compulsory.`
        });
      }
    }

    if (action === 'APPROVE') {
      request.status = 'Approved_Rep';
      await request.save();
      return res.json({ message: 'Product request approved by Sales Representative', request });
    }

    if (action === 'REJECT') {
      request.status = 'Rejected_Rep';
      await request.save();
      return res.json({ message: 'Product request rejected by Sales Representative', request });
    }

    if (action === 'SEND_TO_MANAGER') {
      return escalateToManager(req, res);
    }

    res.status(400).json({ message: 'Invalid action specified' });
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

    // IDEMPOTENCY CHECK: Return existing PENDING approval if already escalated
    let existingApproval = await Approval.findOne({ customerRequest: request._id, currentStep: 'SALES_MANAGER', 'managerApproval.status': 'PENDING' });
    if (existingApproval && request.status === 'Escalated_Manager') {
      return res.json({ message: 'Request already sent to Sales Manager', request, approval: existingApproval });
    }

    const repUser = await User.findById(req.user._id);
    const assignedManagerId = repUser?.salesManagerId || request.customer?.assignedSalesManager || null;

    request.status = 'Escalated_Manager';
    request.escalationReason = escalationReason || `Escalated for manager signoff due to ${request.riskLevel} risk score.`;
    await request.save();

    // Calculate max requested discount for Approval record
    let maxRequestedDisc = 0;
    if (request.items && Array.isArray(request.items)) {
      request.items.forEach(i => {
        if (i.desiredDiscountPercent > maxRequestedDisc) maxRequestedDisc = i.desiredDiscountPercent;
      });
    }

    // Create or update Approval document referencing customerRequest
    let approval = await Approval.findOne({ customerRequest: request._id });
    if (!approval) {
      approval = new Approval({
        customerRequest: request._id,
        customer: request.customer._id || request.customer,
        salesRep: req.user._id,
        salesManager: assignedManagerId,
        requestedDiscount: maxRequestedDisc,
        allowedDiscount: 10,
        currentStep: 'SALES_MANAGER',
        riskScore: request.riskScore,
        riskLevel: request.riskLevel,
        riskReasons: request.riskReasons,
        managerApproval: { status: 'PENDING' },
        auditTrail: [{
          user: req.user._id,
          action: 'SUBMITTED',
          role: req.user.role,
          reason: escalationReason || `Customer Request submitted for Sales Manager approval due to ${request.riskLevel} risk`
        }]
      });
    } else {
      approval.salesManager = assignedManagerId;
      approval.currentStep = 'SALES_MANAGER';
      approval.managerApproval.status = 'PENDING';
      approval.auditTrail.push({
        user: req.user._id,
        action: 'SUBMITTED',
        role: req.user.role,
        reason: escalationReason || `Customer Request re-submitted for Sales Manager approval`
      });
    }
    await approval.save();

    res.json({ message: 'Request sent to Sales Manager for approval successfully', request, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Manager sends request to Finance/Operations for second-level opinion
// @route POST /api/customer-requests/:id/send-to-finance
const sendToFinance = async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await CustomerRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    if (req.user.role === 'SALES_MANAGER') {
      const repUser = await User.findById(request.assignedSalesRep);
      if (repUser && repUser.salesManagerId && repUser.salesManagerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized: Request belongs to another manager\'s team' });
      }
    }

    // IDEMPOTENCY CHECK: If already sent to Finance and status is WAITING_FOR_FINANCE
    if (request.status === 'WAITING_FOR_FINANCE') {
      let existingApproval = await Approval.findOne({ customerRequest: request._id });
      return res.json({ message: 'Request already sent to Finance/Operations', request, approval: existingApproval });
    }

    request.status = 'WAITING_FOR_FINANCE';
    await request.save();

    let approval = await Approval.findOne({ customerRequest: request._id });
    if (!approval) {
      approval = new Approval({
        customerRequest: request._id,
        customer: request.customer,
        salesRep: request.assignedSalesRep,
        salesManager: req.user._id,
        currentStep: 'FINANCE_OPERATIONS',
        riskScore: request.riskScore,
        riskLevel: request.riskLevel,
        riskReasons: request.riskReasons,
        managerApproval: { status: 'PENDING', approvedBy: req.user._id, comment: reason || 'Sent for Finance Review' },
        financeApproval: { status: 'PENDING' },
        auditTrail: [{
          user: req.user._id,
          action: 'SENT_TO_FINANCE',
          role: req.user.role,
          reason: reason || `Manager sent request for mandatory Finance review due to ${request.riskLevel} risk`
        }]
      });
    } else {
      approval.currentStep = 'FINANCE_OPERATIONS';
      approval.financeApproval.status = 'PENDING';
      approval.auditTrail.push({
        user: req.user._id,
        action: 'SENT_TO_FINANCE',
        role: req.user.role,
        reason: reason || `Manager sent request for Finance review due to ${request.riskLevel} risk`
      });
    }

    await approval.save();
    res.json({ message: 'Request sent to Finance/Operations successfully', request, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Finance/Operations provides second-level opinion on a request
// @route POST /api/customer-requests/:id/finance-action
const financeAction = async (req, res) => {
  try {
    const { decision, comment } = req.body; // decision: 'SUPPORT' | 'DO_NOT_SUPPORT' | 'REQUEST_CHANGES'
    const request = await CustomerRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    if (req.user.role !== 'FINANCE_OPERATIONS' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only Finance/Operations users can perform this action' });
    }

    request.status = 'FINANCE_REVIEWED';
    request.financeUserId = req.user._id;
    request.financeDecision = decision || 'SUPPORT';
    request.financeComment = comment || '';
    request.financeDecisionAt = new Date();
    await request.save();

    let approval = await Approval.findOne({ customerRequest: request._id });
    if (approval) {
      approval.currentStep = 'FINANCE_REVIEWED';
      approval.financeApproval = {
        status: decision === 'SUPPORT' ? 'APPROVED' : (decision === 'DO_NOT_SUPPORT' ? 'REJECTED' : 'REQUEST_CHANGES'),
        approvedBy: req.user._id,
        comment: comment || '',
        actionDate: new Date()
      };
      approval.auditTrail.push({
        user: req.user._id,
        action: decision === 'SUPPORT' ? 'APPROVED_BY_FINANCE' : 'FINANCE_OPINION_ADDED',
        role: req.user.role,
        reason: `Finance opinion: ${decision}. ${comment || ''}`
      });
      await approval.save();
    }

    res.json({ message: 'Finance opinion submitted successfully', request, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Manager approves, rejects, or requests negotiation/changes on a request
// @route POST /api/customer-requests/:id/manager-action
const managerAction = async (req, res) => {
  try {
    const { action, comment } = req.body; // action = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'NEGOTIATE'
    const request = await CustomerRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    // STRICT BACKEND RULE FOR HIGH RISK:
    // Manager CANNOT give final APPROVE / REJECT / REQUEST_CHANGES decision before Finance has responded!
    if (request.riskLevel === 'HIGH') {
      if (request.status !== 'FINANCE_REVIEWED' || !request.financeDecision || request.financeDecision === 'NONE') {
        return res.status(403).json({
          message: 'Finance/Operations review is COMPULSORY for High Risk requests before Sales Manager can make a final decision.'
        });
      }
    }

    let approval = await Approval.findOne({ customerRequest: request._id });

    if (action === 'APPROVE') {
      request.status = 'Approved_Manager';
      request.managerComment = comment || 'Approved by Sales Manager.';

      if (approval) {
        approval.managerApproval.status = 'APPROVED';
        approval.managerApproval.approvedBy = req.user._id;
        approval.managerApproval.comment = comment || 'Approved by Sales Manager';
        approval.managerApproval.actionDate = new Date();
        approval.currentStep = 'COMPLETED';
        approval.auditTrail.push({
          user: req.user._id,
          action: 'APPROVED_BY_MANAGER',
          role: req.user.role,
          reason: comment || 'Manager approved customer request'
        });
        await approval.save();
      }
    } else if (action === 'REJECT') {
      request.status = 'Rejected_Manager';
      request.managerComment = comment || 'Rejected by Sales Manager.';

      if (approval) {
        approval.managerApproval.status = 'REJECTED';
        approval.managerApproval.approvedBy = req.user._id;
        approval.managerApproval.comment = comment || 'Rejected by Sales Manager';
        approval.managerApproval.actionDate = new Date();
        approval.currentStep = 'REJECTED';
        approval.auditTrail.push({
          user: req.user._id,
          action: 'REJECTED',
          role: req.user.role,
          reason: comment || 'Manager rejected customer request'
        });
        await approval.save();
      }
    } else if (action === 'REQUEST_CHANGES' || action === 'NEGOTIATE') {
      request.status = 'Negotiation_Required';
      request.managerComment = comment || 'Sales Manager requested negotiation/changes.';

      if (approval) {
        approval.managerApproval.status = 'NEGOTIATION_REQUIRED';
        approval.managerApproval.approvedBy = req.user._id;
        approval.managerApproval.comment = comment || 'Manager requested negotiation';
        approval.managerApproval.actionDate = new Date();
        approval.currentStep = 'NEGOTIATION_REQUIRED';
        approval.auditTrail.push({
          user: req.user._id,
          action: 'RETURNED_FOR_CHANGES',
          role: req.user.role,
          reason: comment || 'Manager requested negotiation with customer'
        });
        await approval.save();
      }
    }

    await request.save();
    res.json({ message: `Request manager decision '${action}' saved successfully`, request, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Representative starts negotiation with customer after Manager requests changes or workflow allows it
// @route POST /api/customer-requests/:id/start-negotiation
const startNegotiationFromRequest = async (req, res) => {
  try {
    const request = await CustomerRequest.findById(req.params.id).populate('customer');
    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    // RBAC Ownership Check
    if (req.user.role === 'SALES_REP' && request.assignedSalesRep.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized: You can only start negotiations for your assigned customer requests' });
    }

    // Permission Check: Must be Negotiation_Required OR LOW risk OR active permission
    if (request.status !== 'Negotiation_Required' && request.riskLevel !== 'LOW' && request.status !== 'Submitted' && request.status !== 'Pending') {
      return res.status(403).json({ message: 'Negotiation cannot be started for this request at its current status.' });
    }

    // IDEMPOTENCY CHECK: Search for existing active negotiation for this request
    const Negotiation = require('../models/Negotiation');
    let existingNegotiation = await Negotiation.findOne({
      customerRequest: request._id,
      status: { $in: ['Open', 'Active', 'Under Review', 'Re-approval Required', 'PENDING_MANAGER_APPROVAL'] }
    }).populate('customer', 'name company tier email')
      .populate('salesRep', 'name email role')
      .populate('messages.sender', 'name role');

    if (existingNegotiation) {
      return res.status(200).json({
        message: 'Active negotiation already exists',
        negotiation: existingNegotiation,
        isExisting: true
      });
    }

    // Determine sales manager ID
    const repUser = await User.findById(req.user._id);
    const assignedManagerId = repUser?.salesManagerId || request.customer?.assignedSalesManager || null;

    // Calculate requested discount from items
    let maxDisc = 0;
    if (request.items && Array.isArray(request.items)) {
      request.items.forEach(i => {
        if (i.desiredDiscountPercent > maxDisc) maxDisc = i.desiredDiscountPercent;
      });
    }

    const negotiation = new Negotiation({
      customerRequest: request._id,
      customer: request.customer._id || request.customer,
      salesRep: req.user._id,
      salesManager: assignedManagerId,
      status: 'Open',
      currentRequestedDiscount: maxDisc,
      messages: [{
        sender: req.user._id,
        senderRole: req.user.role,
        message: request.managerComment ? `[Negotiation Opened by Sales Rep] Manager Note: ${request.managerComment}` : 'Negotiation opened by Sales Representative.',
        timestamp: new Date()
      }],
      history: [{
        action: 'PROPOSED',
        requestedDiscount: maxDisc,
        message: request.managerComment || 'Negotiation started',
        updatedBy: req.user._id,
        updatedByRole: req.user.role,
        timestamp: new Date()
      }]
    });

    await negotiation.save();
    request.activeNegotiation = negotiation._id;
    request.status = 'Negotiation_Required';
    await request.save();

    const populatedNeg = await Negotiation.findById(negotiation._id)
      .populate('customer', 'name company tier email')
      .populate('salesRep', 'name email role')
      .populate('messages.sender', 'name role');

    res.status(201).json({ message: 'Negotiation started successfully', negotiation: populatedNeg, request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Representative creates official Quotation from Customer Product Request (Requires Manager Approval for Medium/High Risk)
// @route POST /api/customer-requests/:id/create-quotation
const createQuotationFromRequest = async (req, res) => {
  try {
    const request = await CustomerRequest.findById(req.params.id)
      .populate('customer')
      .populate('items.product');

    if (!request) {
      return res.status(404).json({ message: 'Customer request not found' });
    }

    if (req.user.role === 'SALES_REP' && request.assignedSalesRep.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage this request' });
    }

    // IDEMPOTENCY CHECK: If active quotation already exists for this request, return it!
    const existingQuotation = await Quotation.findOne({ customerRequest: request._id, status: { $ne: 'Cancelled' } });
    if (existingQuotation) {
      return res.status(200).json({ message: 'Quotation already exists for this request', quotation: existingQuotation, request });
    }

    // STRICT PREREQUISITE RULE: For MEDIUM and HIGH risk requests, Sales Manager approval MUST be obtained BEFORE quotation creation
    if (request.riskLevel === 'MEDIUM' || request.riskLevel === 'HIGH') {
      if (request.status !== 'Approved_Manager') {
        return res.status(403).json({
          message: `Quotation generation is blocked. Sales Manager approval is required for ${request.riskLevel} risk requests before a quotation can be created.`
        });
      }
    } else if (request.riskLevel === 'LOW') {
      if (request.status === 'Rejected_Rep' || request.status === 'Rejected_Manager') {
        return res.status(400).json({ message: 'Cannot generate quotation for a rejected request.' });
      }
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

    const salesRepUser = await User.findById(req.user._id);
    const assignedManagerId = salesRepUser?.salesManagerId || null;

    const quotation = new Quotation({
      quoteNumber,
      customer: request.customer._id,
      customerRequest: request._id,
      salesRep: req.user._id,
      assignedSalesManager: assignedManagerId,
      items: formattedItems,
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      tax,
      grandTotal,
      status: 'Draft',
      riskScore: riskAnalysis.score,
      riskLevel: riskAnalysis.level,
      riskReasons: riskAnalysis.reasons,
      approvalChainState: request.status === 'Approved_Manager' ? 'APPROVED' : 'NONE',
      notes: notes || `Created from Product Request ${request.requestNumber}`
    });

    await quotation.save();

    // Link quotation to Approval document if it exists
    let approval = await Approval.findOne({ customerRequest: request._id });
    if (approval) {
      approval.quotation = quotation._id;
      await approval.save();
    }

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
  repActionOnRequest,
  escalateToManager,
  sendToFinance,
  financeAction,
  managerAction,
  startNegotiationFromRequest,
  createQuotationFromRequest
};

