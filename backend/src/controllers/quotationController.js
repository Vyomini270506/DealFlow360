const Quotation = require('../models/Quotation');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Approval = require('../models/Approval');
const User = require('../models/User');
const { validateQuotationDiscounts } = require('../services/discountValidator');
const { calculateRiskScore } = require('../services/riskEngine');

// @desc Get all quotations based on RBAC
// @route GET /api/quotations
const getQuotations = async (req, res) => {
  try {
    const { status, riskLevel, search, sort = '-createdAt' } = req.query;
    let filter = {};

    // RBAC Scope
    if (req.user.role === 'SALES_REP') {
      filter.salesRep = req.user._id;
    } else if (req.user.role === 'SALES_MANAGER') {
      // Find all reps reporting to this manager
      const teamReps = await User.find({ salesManagerId: req.user._id }).select('_id');
      const repIds = teamReps.map(r => r._id);
      filter.salesRep = { $in: [...repIds, req.user._id] };
    } else if (req.user.role === 'CUSTOMER') {
      if (req.user.customerId) {
        filter.customer = req.user.customerId._id || req.user.customerId;
        // Customer must NOT see quotations waiting for approval or in draft state
        filter.status = { $nin: ['Draft', 'Pending Approval'] };
      }
    }

    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;

    let query = Quotation.find(filter)
      .populate('customer', 'name company tier email')
      .populate('salesRep', 'name email')
      .populate('items.product', 'name category unitPrice sku')
      .sort(sort);

    let quotations = await query;

    const { calculateBlendedDiscountRisk } = require('../services/riskEngine');
    for (let qDoc of quotations) {
      const riskAnalysis = await calculateBlendedDiscountRisk({
        items: qDoc.items,
        customerId: qDoc.customer
      });
      if (qDoc.riskScore !== riskAnalysis.riskScore || qDoc.riskLevel !== riskAnalysis.riskLevel) {
        qDoc.riskScore = riskAnalysis.riskScore;
        qDoc.riskLevel = riskAnalysis.riskLevel;
        qDoc.managerApprovalRequired = riskAnalysis.managerApprovalRequired;
        qDoc.approvalRequired = riskAnalysis.approvalRequired;
        qDoc.financeReviewRequired = riskAnalysis.financeReviewRequired;
        qDoc.riskFactors = riskAnalysis.riskFactors;
        qDoc.riskReasons = riskAnalysis.riskReasons;
        await qDoc.save();
      }
    }

    if (search) {
      const s = search.toLowerCase();
      quotations = quotations.filter(q => 
        q.quoteNumber.toLowerCase().includes(s) ||
        (q.customer && q.customer.company && q.customer.company.toLowerCase().includes(s)) ||
        (q.customer && q.customer.name && q.customer.name.toLowerCase().includes(s))
      );
    }

    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get quotation by ID
// @route GET /api/quotations/:id
const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer')
      .populate('salesRep', 'name email role')
      .populate('items.product');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Check RBAC permission
    if (req.user.role === 'CUSTOMER') {
      const userCustId = req.user.customerId?._id ? req.user.customerId._id.toString() : req.user.customerId?.toString();
      if (!userCustId || quotation.customer._id.toString() !== userCustId) {
        return res.status(403).json({ message: 'Not authorized to view this quotation' });
      }
      if (quotation.status === 'Draft' || quotation.status === 'Pending Approval') {
        return res.status(403).json({ message: 'Quotation is currently under review and has not been released to customer' });
      }
    }

    if (req.user.role === 'SALES_REP' && quotation.salesRep && quotation.salesRep._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this quotation' });
    }

    const approval = await Approval.findOne({ quotation: quotation._id })
      .populate('managerApproval.approvedBy', 'name email')
      .populate('financeApproval.approvedBy', 'name email')
      .populate('auditTrail.user', 'name email role');

    res.json({ quotation, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create new quotation with Automatic Least-Workload Sales Rep Assignment
// @route POST /api/quotations
const createQuotation = async (req, res) => {
  try {
    const { customerId, customerRequest, items, notes } = req.body;

    if (customerRequest) {
      const existingQuotation = await Quotation.findOne({ customerRequest, status: { $ne: 'Cancelled' } })
        .populate('customer')
        .populate('salesRep', 'name email')
        .populate('items.product');
      if (existingQuotation) {
        return res.status(200).json(existingQuotation);
      }
    }

    const count = await Quotation.countDocuments();

    const quoteNumber = `Q-${1000 + count + 1}`;

    const targetCustomer = await Customer.findById(customerId);

    // Determine Sales Rep via Automatic Least-Workload Algorithm
    let assignedRepId = req.user.role === 'SALES_REP' ? req.user._id : null;
    let assignedManagerId = null;

    if (targetCustomer && targetCustomer.assignedSalesRepresentative) {
      assignedRepId = targetCustomer.assignedSalesRepresentative;
      assignedManagerId = targetCustomer.assignedSalesManager;
    } else {
      const salesReps = await User.find({ role: 'SALES_REP' });
      if (salesReps.length > 0) {
        let lowestWorkloadRep = null;
        let minActiveCount = Infinity;

        const activeStatuses = ['Draft', 'Pending Approval', 'Negotiation', 'Approved', 'Confirmed', 'Fulfillment'];

        for (const rep of salesReps) {
          const activeCount = await Quotation.countDocuments({
            salesRep: rep._id,
            status: { $in: activeStatuses }
          });

          if (activeCount < minActiveCount) {
            minActiveCount = activeCount;
            lowestWorkloadRep = rep;
          }
        }

        if (lowestWorkloadRep) {
          assignedRepId = lowestWorkloadRep._id;
          assignedManagerId = lowestWorkloadRep.salesManagerId;

          if (targetCustomer) {
            targetCustomer.assignedSalesRepresentative = lowestWorkloadRep._id;
            targetCustomer.assignedSalesManager = lowestWorkloadRep.salesManagerId;
            targetCustomer.assignmentStatus = 'REP_ASSIGNED';
            targetCustomer.assignedAt = new Date();
            await targetCustomer.save();
          }
        }
      }
    }

    // Validate discounts
    const { processedItems, totalBreaches, breachSummary } = await validateQuotationDiscounts(items, customerId);

    // Calculate subtotal, discount, tax, grandTotal
    let subtotal = 0;
    let totalDiscount = 0;

    processedItems.forEach(item => {
      subtotal += item.unitPrice * item.quantity;
      totalDiscount += (item.unitPrice * (item.discountPercent / 100)) * item.quantity;
    });

    const afterDiscount = subtotal - totalDiscount;
    const tax = Number((afterDiscount * 0.18).toFixed(2)); // 18% GST/Tax
    const grandTotal = Number((afterDiscount + tax).toFixed(2));

    // Calculate universal Risk Score & Level
    const riskAnalysis = await calculateRiskScore({
      items: processedItems,
      customerId: customerId
    });

    const quotation = new Quotation({
      quoteNumber,
      customer: customerId,
      salesRep: assignedRepId,
      assignedSalesManager: assignedManagerId,
      assignmentStatus: 'REP_ASSIGNED',
      items: processedItems,
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      tax,
      grandTotal,
      status: 'Draft',
      riskScore: riskAnalysis.riskScore,
      riskLevel: riskAnalysis.riskLevel,
      approvalRequired: riskAnalysis.managerApprovalRequired || riskAnalysis.approvalRequired,
      managerApprovalRequired: riskAnalysis.managerApprovalRequired || riskAnalysis.approvalRequired,
      financeReviewRequired: riskAnalysis.financeReviewRequired,
      riskFactors: riskAnalysis.riskFactors,
      riskReasons: riskAnalysis.riskReasons,
      approvalChainState: (riskAnalysis.managerApprovalRequired || riskAnalysis.approvalRequired) ? 'SALES_MANAGER' : 'NONE',
      notes
    });

    await quotation.save();

    const populated = await Quotation.findById(quotation._id)
      .populate('customer')
      .populate('salesRep', 'name email')
      .populate('items.product');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Submit quotation for approval
// @route POST /api/quotations/:id/submit
const submitQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.status === 'Closed' || quotation.status === 'CLOSED') {
      return res.status(400).json({ message: 'Deal is closed & finalized by both Customer and Sales Representative. No further changes can be made.' });
    }

    // Re-evaluate universal risk score
    const riskAnalysis = await calculateRiskScore({
      items: quotation.items,
      customerId: quotation.customer
    });

    quotation.riskScore = riskAnalysis.riskScore;
    quotation.riskLevel = riskAnalysis.riskLevel;
    quotation.approvalRequired = riskAnalysis.managerApprovalRequired || riskAnalysis.approvalRequired;
    quotation.managerApprovalRequired = riskAnalysis.managerApprovalRequired || riskAnalysis.approvalRequired;
    quotation.financeReviewRequired = riskAnalysis.financeReviewRequired;
    quotation.riskFactors = riskAnalysis.riskFactors;
    quotation.riskReasons = riskAnalysis.riskReasons;

    // Send for Manager approval
    quotation.status = 'Pending Approval';
    quotation.approvalChainState = 'SALES_MANAGER';

    const salesRepUser = await User.findById(quotation.salesRep);
    const assignedManagerId = quotation.assignedSalesManager || salesRepUser?.salesManagerId || null;

    await quotation.save();

    // Calculate max discount requested vs allowed across items
    let maxRequestedDisc = 0;
    let maxAllowedDisc = 0;
    if (quotation.items && Array.isArray(quotation.items)) {
      quotation.items.forEach(i => {
        if (i.discountPercent > maxRequestedDisc) maxRequestedDisc = i.discountPercent;
        if (i.allowedDiscountPercent > maxAllowedDisc) maxAllowedDisc = i.allowedDiscountPercent;
      });
    }

    // Create or update Approval document
    let approval = await Approval.findOne({ quotation: quotation._id });
    if (!approval) {
      approval = new Approval({
        quotation: quotation._id,
        customerRequest: quotation.customerRequest || null,
        customer: quotation.customer,
        salesRep: quotation.salesRep,
        salesManager: assignedManagerId,
        requestedDiscount: maxRequestedDisc,
        allowedDiscount: maxAllowedDisc,
        currentStep: 'SALES_MANAGER',
        riskScore: riskAnalysis.score,
        riskLevel: riskAnalysis.level,
        riskReasons: riskAnalysis.reasons,
        managerApproval: { status: 'PENDING' },
        financeApproval: { status: riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED' },
        auditTrail: [{
          user: req.user._id,
          action: 'SUBMITTED',
          role: req.user.role,
          reason: 'Quotation submitted for Sales Manager approval'
        }]
      });
    } else {
      approval.customerRequest = quotation.customerRequest || approval.customerRequest;
      approval.customer = quotation.customer || approval.customer;
      approval.salesManager = assignedManagerId || approval.salesManager;
      approval.requestedDiscount = maxRequestedDisc;
      approval.allowedDiscount = maxAllowedDisc;
      approval.currentStep = 'SALES_MANAGER';
      approval.riskScore = riskAnalysis.score;
      approval.riskLevel = riskAnalysis.level;
      approval.riskReasons = riskAnalysis.reasons;
      approval.managerApproval.status = 'PENDING';
      approval.financeApproval.status = riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED';
      approval.auditTrail.push({
        user: req.user._id,
        action: 'SUBMITTED',
        role: req.user.role,
        reason: 'Quotation re-submitted for Sales Manager approval'
      });
    }

    await approval.save();

    // NOTIFY SALES MANAGER OF REP SUBMISSION
    const { notifyManagersForRepAction } = require('../utils/notificationHelper');
    await notifyManagersForRepAction({
      repId: req.user._id,
      title: 'Quotation Submitted for Approval',
      message: `Sales Representative ${req.user.name || 'Rep'} submitted Quotation ${quotation.quoteNumber} for Sales Manager signoff.`
    });

    res.json({ quotation, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Customer accepts official quotation
// @route POST /api/quotations/:id/accept
const acceptQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.status === 'Closed' || quotation.status === 'CLOSED') {
      return res.status(400).json({ message: 'Deal is closed & finalized by both Customer and Sales Representative. No further changes can be made.' });
    }

    if (req.user.role === 'CUSTOMER') {
      const userCustId = req.user.customerId?._id ? req.user.customerId._id.toString() : req.user.customerId?.toString();
      if (!userCustId || quotation.customer.toString() !== userCustId) {
        return res.status(403).json({ message: 'Not authorized to accept this quotation' });
      }
    }

    const { finalizeClosedDeal } = require('../services/dealClosureService');
    const result = await finalizeClosedDeal({
      quotationId: quotation._id,
      userId: req.user._id,
      userRole: req.user.role
    });

    res.json({
      message: 'Quotation accepted & deal closed successfully!',
      quotation: result.quotation,
      invoice: result.invoice,
      subscriptions: result.subscriptions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Customer rejects official quotation
// @route POST /api/quotations/:id/reject
const rejectQuotation = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.status === 'Closed' || quotation.status === 'CLOSED') {
      return res.status(400).json({ message: 'Deal is closed & finalized by both Customer and Sales Representative. No further changes can be made.' });
    }

    if (req.user.role === 'CUSTOMER') {
      const userCustId = req.user.customerId?._id ? req.user.customerId._id.toString() : req.user.customerId?.toString();
      if (!userCustId || quotation.customer.toString() !== userCustId) {
        return res.status(403).json({ message: 'Not authorized to reject this quotation' });
      }
    }

    quotation.status = 'Rejected';
    quotation.approvalChainState = 'REJECTED';
    quotation.rejectedBy = req.user._id;
    quotation.rejectedAt = new Date();
    quotation.rejectionReason = rejectionReason || 'Customer rejected quotation';
    if (rejectionReason) quotation.notes = `Customer Rejection: ${rejectionReason}`;

    await quotation.save();

    res.json({ message: 'Quotation rejected.', quotation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Rep sends quotation to Customer
// @route POST /api/quotations/:id/send
const sendQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.status === 'Closed' || quotation.status === 'CLOSED') {
      return res.status(400).json({ message: 'Deal is closed & finalized by both Customer and Sales Representative. No further changes can be made.' });
    }

    if (req.user.role === 'SALES_REP') {
      if (quotation.salesRep && quotation.salesRep.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to send this quotation' });
      }

      // Risk enforcement: Medium and High risk quotations MUST be approved by Sales Manager
      if ((quotation.riskLevel === 'MEDIUM' || quotation.riskLevel === 'HIGH') && quotation.approvalChainState !== 'APPROVED') {
        return res.status(403).json({
          message: `${quotation.riskLevel} risk quotations require Sales Manager approval before sending to customer.`
        });
      }
    }

    quotation.status = 'Approved';
    quotation.approvalChainState = 'APPROVED';
    await quotation.save();

    const CustomerRequest = require('../models/CustomerRequest');
    if (quotation.customerRequest) {
      await CustomerRequest.findByIdAndUpdate(quotation.customerRequest, { status: 'Quoted' });
    }

    const { updateCustomerTierByOrderCount } = require('../utils/customerTierHelper');
    await updateCustomerTierByOrderCount(quotation.customer);

    // NOTIFY SALES MANAGER AND CUSTOMER OF QUOTATION SENT
    const { notifyManagersForRepAction, notifyCustomerAndRepOnManagerAction } = require('../utils/notificationHelper');
    await notifyManagersForRepAction({
      repId: req.user._id,
      title: 'Quotation Issued to Customer',
      message: `Sales Representative ${req.user.name || 'Rep'} issued Quotation ${quotation.quoteNumber} to Customer.`
    });

    res.json({ message: 'Quotation sent to Customer successfully!', quotation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Discard/Soft Delete Quotation (Available for Customer, Rep, Manager, Finance, Admin)
// @route POST /api/quotations/:id/discard
const discardQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    quotation.status = 'DISCARDED';
    await quotation.save();

    res.json({ message: 'Quotation discarded successfully and moved to Discarded Records', quotation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Final confirmation modal handler: Confirm & Close Deal
// @route POST /api/quotations/:id/confirm-final
const confirmFinalDeal = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer')
      .populate('items.product');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.status === 'Closed' || quotation.status === 'CLOSED') {
      return res.status(200).json({ message: 'Deal is already closed & finalized', quotation });
    }

    // 1. Close Quotation
    quotation.status = 'Closed';
    quotation.acceptedBy = req.user._id;
    quotation.acceptedAt = new Date();
    await quotation.save();

    // 2. Close Customer Request
    if (quotation.customerRequest) {
      const CustomerRequest = require('../models/CustomerRequest');
      await CustomerRequest.findByIdAndUpdate(quotation.customerRequest, { status: 'Closed' });
    }

    // 3. Close linked Negotiation
    const Negotiation = require('../models/Negotiation');
    await Negotiation.updateMany(
      { quotation: quotation._id },
      { 
        $set: { 
          status: 'Closed',
          'customerConfirmation.status': 'CONFIRMED',
          'salesRepConfirmation.status': 'CONFIRMED'
        } 
      }
    );

    // 4. Post-Closure Automated Workflows (Product Invoice, Subscription, Fulfillment)
    const Product = require('../models/Product');
    const Invoice = require('../models/Invoice');
    const Subscription = require('../models/Subscription');
    const { allocateFulfillmentStock } = require('../services/fulfillmentService');

    let hasPhysicalProducts = false;
    let hasRecurringServices = false;
    const physicalItems = [];
    const subscriptionItems = [];

    for (const item of quotation.items) {
      const prod = item.product;
      const category = prod?.category || 'Hardware';

      if (category === 'Services' || category.toLowerCase().includes('subscription') || category.toLowerCase().includes('service')) {
        hasRecurringServices = true;
        subscriptionItems.push(item);
      } else {
        hasPhysicalProducts = true;
        physicalItems.push(item);
      }
    }

    // Create Product Invoice & Trigger Fulfillment Allocation
    let productInvoice = null;
    let fulfillmentRecord = null;

    if (hasPhysicalProducts || quotation.items.length > 0) {
      fulfillmentRecord = await allocateFulfillmentStock(quotation);

      const invCount = await Invoice.countDocuments();
      const invoiceNumber = `INV-${1000 + invCount + 1}`;

      const invItems = quotation.items.map(i => ({
        product: i.product._id || i.product,
        shippedQuantity: i.quantity,
        unitPrice: i.finalUnitPrice || i.unitPrice,
        lineTotal: i.lineTotal
      }));

      productInvoice = await Invoice.create({
        invoiceNumber,
        quotation: quotation._id,
        fulfillment: fulfillmentRecord?._id || null,
        customer: quotation.customer._id || quotation.customer,
        type: 'PRODUCT',
        items: invItems,
        subtotal: quotation.subtotal,
        tax: quotation.tax,
        grandTotal: quotation.grandTotal,
        paymentStatus: 'Unpaid',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    // Create Subscription if recurring service items exist
    const createdSubscriptions = [];
    if (hasRecurringServices) {
      for (const sItem of subscriptionItems) {
        const prod = sItem.product;
        const subCount = await Subscription.countDocuments();
        const subscriptionNumber = `SUB-${1000 + subCount + 1}`;

        const sub = await Subscription.create({
          subscriptionNumber,
          customer: quotation.customer._id || quotation.customer,
          product: prod._id || prod,
          planName: prod.name || 'Recurring Service Plan',
          billingCycle: 'Monthly',
          amount: sItem.lineTotal,
          status: 'Active',
          startDate: new Date(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        createdSubscriptions.push(sub);
      }
    }

    // Recalculate Customer Tier based on updated closed order count
    const { updateCustomerTierByOrderCount } = require('../utils/customerTierHelper');
    await updateCustomerTierByOrderCount(quotation.customer._id || quotation.customer);

    res.json({
      message: '🎉 Deal successfully CONFIRMED & CLOSED! Quotation moved to Closed Deals.',
      quotation,
      invoice: productInvoice,
      fulfillment: fulfillmentRecord,
      subscriptions: createdSubscriptions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all Closed Deals for history & reporting
// @route GET /api/quotations/closed-deals
const getClosedDeals = async (req, res) => {
  try {
    let filter = { status: { $in: ['Closed', 'CLOSED'] } };

    if (req.user.role === 'CUSTOMER') {
      const userCustId = req.user.customerId?._id ? req.user.customerId._id : req.user.customerId;
      filter.customer = userCustId;
    } else if (req.user.role === 'SALES_REP') {
      filter.salesRep = req.user._id;
    } else if (req.user.role === 'SALES_MANAGER') {
      const teamReps = await User.find({ salesManagerId: req.user._id }).select('_id');
      filter.salesRep = { $in: teamReps.map(r => r._id) };
    }

    const closedDeals = await Quotation.find(filter)
      .populate('customer', 'name company tier email phone')
      .populate('salesRep', 'name email role')
      .populate('assignedSalesManager', 'name email')
      .populate('items.product', 'name category unitPrice sku')
      .sort('-updatedAt');

    res.json(closedDeals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  submitQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  discardQuotation,
  confirmFinalDeal,
  getClosedDeals
};

