const Negotiation = require('../models/Negotiation');
const Quotation = require('../models/Quotation');
const Approval = require('../models/Approval');
const CustomerRequest = require('../models/CustomerRequest');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const { validateQuotationDiscounts } = require('../services/discountValidator');
const { calculateRiskScore } = require('../services/riskEngine');
const { allocateFulfillmentStock } = require('../services/fulfillmentService');
const { updateCustomerTierByOrderCount } = require('../utils/customerTierHelper');

// Helper to populate negotiation documents consistently
const populateNegotiationQuery = (query) => {
  return query
    .populate({
      path: 'quotation',
      populate: [
        { path: 'salesRep', select: 'name email role' },
        { path: 'assignedSalesManager', select: 'name email role' },
        { path: 'items.product', select: 'name unitPrice sku category' }
      ]
    })
    .populate({
      path: 'customerRequest',
      populate: [
        { path: 'assignedSalesRep', select: 'name email role' },
        { path: 'items.product', select: 'name unitPrice sku category' }
      ]
    })
    .populate('customer', 'name company tier email phone')
    .populate('salesRep', 'name email role phone')
    .populate('salesManager', 'name email role')
    .populate('messages.sender', 'name role avatar email')
    .populate('history.updatedBy', 'name role email');
};

// Helper to check user access rights to a negotiation
const checkNegotiationAccess = async (reqUser, negotiation, customerRequestObj, quotationObj) => {
  if (!reqUser) return false;
  const role = reqUser.role;

  if (role === 'ADMIN' || role === 'FINANCE_OPERATIONS') return true;

  // Derive Customer ID for logged-in user
  let userCustId = null;
  if (role === 'CUSTOMER') {
    userCustId = reqUser.customerId?._id ? reqUser.customerId._id.toString() : reqUser.customerId?.toString();
    if (!userCustId) {
      const custDoc = await Customer.findOne({ email: reqUser.email });
      if (custDoc) userCustId = custDoc._id.toString();
    }
  }

  // Customer authorization
  if (role === 'CUSTOMER') {
    if (!userCustId) return false;
    const negCust = negotiation?.customer?._id ? negotiation.customer._id.toString() : negotiation?.customer?.toString();
    const quoteCust = quotationObj?.customer?._id ? quotationObj.customer._id.toString() : quotationObj?.customer?.toString();
    const reqCust = customerRequestObj?.customer?._id ? customerRequestObj.customer._id.toString() : customerRequestObj?.customer?.toString();

    return (negCust === userCustId || quoteCust === userCustId || reqCust === userCustId);
  }

  // Sales Rep authorization
  if (role === 'SALES_REP') {
    const userId = reqUser._id.toString();
    const negRep = negotiation?.salesRep?._id ? negotiation.salesRep._id.toString() : negotiation?.salesRep?.toString();
    const quoteRep = quotationObj?.salesRep?._id ? quotationObj.salesRep._id.toString() : quotationObj?.salesRep?.toString();
    const reqRep = customerRequestObj?.assignedSalesRep?._id ? customerRequestObj.assignedSalesRep._id.toString() : customerRequestObj?.assignedSalesRep?.toString();

    return (negRep === userId || quoteRep === userId || reqRep === userId);
  }

  // Sales Manager authorization
  if (role === 'SALES_MANAGER') {
    const userId = reqUser._id.toString();
    const negMgr = negotiation?.salesManager?._id ? negotiation.salesManager._id.toString() : negotiation?.salesManager?.toString();
    const quoteMgr = quotationObj?.assignedSalesManager?._id ? quotationObj.assignedSalesManager._id.toString() : quotationObj?.assignedSalesManager?.toString();

    if (negMgr === userId || quoteMgr === userId) return true;

    // Check if sales rep belongs to this manager's team
    const teamReps = await User.find({ salesManagerId: reqUser._id }).select('_id');
    const teamRepIds = teamReps.map(r => r._id.toString());

    const negRep = negotiation?.salesRep?._id ? negotiation.salesRep._id.toString() : negotiation?.salesRep?.toString();
    const quoteRep = quotationObj?.salesRep?._id ? quotationObj.salesRep._id.toString() : quotationObj?.salesRep?.toString();

    return teamRepIds.includes(negRep) || teamRepIds.includes(quoteRep);
  }

  return false;
};

// @desc Get negotiation thread by Quotation ID
// @route GET /api/negotiations/quotation/:quotationId
const getNegotiationByQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.quotationId);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    let negotiation = await populateNegotiationQuery(
      Negotiation.findOne({ quotation: req.params.quotationId })
    );

    if (!negotiation) {
      // Authorization Check before initializing new thread
      const isAuth = await checkNegotiationAccess(req.user, null, null, quotation);
      if (!isAuth) {
        return res.status(403).json({ message: 'Not authorized to access negotiation for this quotation' });
      }

      let maxDisc = 0;
      if (quotation.items && Array.isArray(quotation.items)) {
        quotation.items.forEach(i => {
          if (i.discountPercent > maxDisc) maxDisc = i.discountPercent;
        });
      }

      negotiation = new Negotiation({
        quotation: quotation._id,
        customerRequest: quotation.customerRequest || null,
        customer: quotation.customer,
        salesRep: quotation.salesRep,
        salesManager: quotation.assignedSalesManager || null,
        status: 'Open',
        currentRequestedDiscount: maxDisc,
        messages: []
      });
      await negotiation.save();

      negotiation = await populateNegotiationQuery(Negotiation.findById(negotiation._id));
    } else {
      const isAuth = await checkNegotiationAccess(req.user, negotiation, negotiation.customerRequest, negotiation.quotation);
      if (!isAuth) {
        return res.status(403).json({ message: 'Not authorized to access this negotiation thread' });
      }
    }

    res.json(negotiation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get negotiation thread by CustomerRequest ID
// @route GET /api/negotiations/customer-request/:requestId
const getNegotiationByCustomerRequest = async (req, res) => {
  try {
    const request = await CustomerRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: 'Customer Request not found' });
    }

    let negotiation = await populateNegotiationQuery(
      Negotiation.findOne({ customerRequest: req.params.requestId })
    );

    if (!negotiation) {
      // RULE: A negotiation can ONLY exist if an active quotation/offer exists!
      const quotation = await Quotation.findOne({ customerRequest: request._id, status: { $nin: ['DISCARDED', 'WITHDRAWN'] } });
      if (!quotation) {
        return res.status(404).json({ message: 'No quotation/offer exists for this request yet. A quotation must be created before starting negotiation.' });
      }

      const isAuth = await checkNegotiationAccess(req.user, null, request, quotation);
      if (!isAuth) {
        return res.status(403).json({ message: 'Not authorized to access negotiation for this request' });
      }

      let maxDisc = 0;
      if (request.items && Array.isArray(request.items)) {
        request.items.forEach(i => {
          if (i.desiredDiscountPercent > maxDisc) maxDisc = i.desiredDiscountPercent;
        });
      }

      negotiation = new Negotiation({
        quotation: quotation._id,
        customerRequest: request._id,
        customer: quotation.customer || request.customer,
        salesRep: quotation.salesRep || request.assignedSalesRep,
        salesManager: quotation.assignedSalesManager || null,
        status: 'Open',
        currentRequestedDiscount: maxDisc,
        messages: [{
          sender: req.user._id,
          senderRole: req.user.role,
          message: request.managerComment ? `[Negotiation Thread Opened] Manager Note: ${request.managerComment}` : 'Negotiation thread opened for official quotation.',
          timestamp: new Date()
        }]
      });
      await negotiation.save();

      negotiation = await populateNegotiationQuery(Negotiation.findById(negotiation._id));
    } else {
      const isAuth = await checkNegotiationAccess(req.user, negotiation, negotiation.customerRequest, negotiation.quotation);
      if (!isAuth) {
        return res.status(403).json({ message: 'Not authorized to access this negotiation thread' });
      }
    }

    res.json(negotiation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Add message or counter discount proposal by Quotation ID
// @route POST /api/negotiations/quotation/:quotationId/message
const addNegotiationMessage = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.quotationId);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    let negotiation = await Negotiation.findOne({ quotation: quotation._id });
    if (!negotiation) {
      negotiation = new Negotiation({
        quotation: quotation._id,
        customerRequest: quotation.customerRequest || null,
        customer: quotation.customer,
        salesRep: quotation.salesRep,
        salesManager: quotation.assignedSalesManager || null,
        status: 'Open',
        messages: []
      });
      await negotiation.save();
    }

    const isAuth = await checkNegotiationAccess(req.user, negotiation, null, quotation);
    if (!isAuth) {
      return res.status(403).json({ message: 'Not authorized to negotiate on this deal' });
    }

    // Check deal status
    if (quotation.status === 'Closed' || quotation.status === 'CLOSED' || quotation.status === 'WITHDRAWN' || quotation.status === 'DISCARDED' || negotiation.status === 'Closed') {
      return res.status(400).json({ message: 'Deal is closed, withdrawn, or discarded. No further negotiation changes can be made.' });
    }

    const { itemIndex, message, counterDiscountPercent } = req.body;

    // Validate against Manager max ceiling if set
    if (counterDiscountPercent !== undefined && counterDiscountPercent !== null && counterDiscountPercent !== '') {
      const proposedDisc = Number(counterDiscountPercent);
      if (req.user.role === 'CUSTOMER' || req.user.role === 'SALES_REP') {
        if (negotiation.managerMaxAllowedDiscount !== null && negotiation.managerMaxAllowedDiscount !== undefined) {
          if (proposedDisc > negotiation.managerMaxAllowedDiscount) {
            return res.status(400).json({
              message: `Proposed discount (${proposedDisc}%) exceeds the Sales Manager's maximum authorized limit of ${negotiation.managerMaxAllowedDiscount}%.`
            });
          }
        }
      }
    }

    let parsedDisc = counterDiscountPercent !== undefined && counterDiscountPercent !== null && counterDiscountPercent !== '' ? Number(counterDiscountPercent) : null;

    negotiation.messages.push({
      sender: req.user._id,
      senderRole: req.user.role,
      itemIndex: itemIndex !== undefined && itemIndex !== null ? Number(itemIndex) : null,
      message: message || '',
      counterDiscountPercent: parsedDisc,
      timestamp: new Date()
    });

    if (parsedDisc !== null) {
      negotiation.currentRequestedDiscount = parsedDisc;
      negotiation.history.push({
        action: req.user.role === 'CUSTOMER' ? 'COUNTER_OFFER' : 'PROPOSED',
        requestedDiscount: parsedDisc,
        message: message || 'Counter discount proposed',
        updatedBy: req.user._id,
        updatedByRole: req.user.role,
        timestamp: new Date()
      });
    }

    let triggerReapproval = false;

    if (parsedDisc !== null && quotation.items && quotation.items.length > 0) {
      let targetIdx = itemIndex;
      if (targetIdx === undefined || targetIdx === null) {
        if (quotation.items.length === 1) targetIdx = 0;
      }

      if (targetIdx !== undefined && targetIdx !== null && quotation.items[targetIdx]) {
        quotation.items[targetIdx].discountPercent = parsedDisc;
      } else {
        // Uniform update across all line items
        quotation.items.forEach(i => {
          i.discountPercent = parsedDisc;
        });
      }

      // Recalculate line totals
      let subtotal = 0;
      let totalDiscount = 0;
      quotation.items.forEach(item => {
        subtotal += item.unitPrice * item.quantity;
        totalDiscount += (item.unitPrice * (item.discountPercent / 100)) * item.quantity;
        item.finalUnitPrice = Number((item.unitPrice * (1 - item.discountPercent / 100)).toFixed(2));
        item.lineTotal = Number((item.finalUnitPrice * item.quantity).toFixed(2));
      });

      quotation.subtotal = Number(subtotal.toFixed(2));
      quotation.totalDiscount = Number(totalDiscount.toFixed(2));
      quotation.tax = Number(((subtotal - totalDiscount) * 0.18).toFixed(2));
      quotation.grandTotal = Number(((subtotal - totalDiscount) + quotation.tax).toFixed(2));

      // Re-validate discounts & risk
      const { totalBreaches } = await validateQuotationDiscounts(quotation.items, quotation.customer);
      const riskAnalysis = await calculateRiskScore({
        items: quotation.items,
        grandTotal: quotation.grandTotal,
        totalBreaches,
        isNegotiationActive: true
      });

      quotation.riskScore = riskAnalysis.score;
      quotation.riskLevel = riskAnalysis.level;
      quotation.riskReasons = riskAnalysis.reasons;

      if (totalBreaches > 0 || riskAnalysis.score >= 30) {
        triggerReapproval = true;
        quotation.status = 'Pending Approval';
        quotation.approvalChainState = 'SALES_MANAGER';
        negotiation.status = 'Re-approval Required';

        let approval = await Approval.findOne({ quotation: quotation._id });
        if (!approval) {
          approval = new Approval({
            quotation: quotation._id,
            customerRequest: quotation.customerRequest || null,
            customer: quotation.customer,
            salesRep: quotation.salesRep,
            salesManager: quotation.assignedSalesManager || null,
            currentStep: 'SALES_MANAGER',
            riskScore: riskAnalysis.score,
            riskLevel: riskAnalysis.level,
            riskReasons: riskAnalysis.reasons,
            managerApproval: { status: 'PENDING' },
            financeApproval: { status: riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED' }
          });
        } else {
          approval.currentStep = 'SALES_MANAGER';
          approval.managerApproval.status = 'PENDING';
          approval.financeApproval.status = riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED';
        }

        approval.auditTrail.push({
          user: req.user._id,
          action: 'CUSTOMER_COUNTER',
          role: req.user.role,
          reason: `Counter-offer of ${parsedDisc}% triggered re-approval workflow.`
        });
        await approval.save();
      }
    }

    if ((quotation.status === 'Draft' || quotation.status === 'Approved') && !triggerReapproval) {
      quotation.status = 'Negotiation';
    }

    await quotation.save();
    await negotiation.save();

    const populatedNeg = await populateNegotiationQuery(Negotiation.findById(negotiation._id));

    res.json({ negotiation: populatedNeg, quotation, triggerReapproval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get customer negotiation corner details
// @route GET /api/negotiations/customer-corner
const getCustomerNegotiations = async (req, res) => {
  try {
    let custId = req.user.customerId?._id ? req.user.customerId._id : req.user.customerId;
    if (!custId && req.user.role === 'CUSTOMER') {
      const cust = await Customer.findOne({ email: req.user.email });
      if (cust) custId = cust._id;
    }

    const filter = custId
      ? { $or: [{ customer: custId }, { customer: req.user._id }], status: { $ne: 'DISCARDED' } }
      : { customer: req.user._id, status: { $ne: 'DISCARDED' } };

    const negotiations = await populateNegotiationQuery(
      Negotiation.find(filter).sort('-updatedAt')
    );

    res.json(negotiations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Customer or Sales Rep reopens negotiation to negotiate terms again
// @route POST /api/negotiations/reopen
const reopenNegotiation = async (req, res) => {
  try {
    const { quotationId, requestId, proposedDiscountPercent, message } = req.body;

    let quotation = null;
    let customerRequest = null;

    if (quotationId) {
      quotation = await Quotation.findById(quotationId);
    }
    if (!quotation && requestId) {
      customerRequest = await CustomerRequest.findById(requestId);
      if (customerRequest && customerRequest.quotation) {
        quotation = await Quotation.findById(customerRequest.quotation);
      }
    }

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation document not found for negotiation' });
    }

    if (quotation.status === 'Closed' || quotation.status === 'CLOSED' || quotation.status === 'WITHDRAWN' || quotation.status === 'DISCARDED') {
      return res.status(400).json({ message: 'Cannot negotiate again on a deal that is already closed, withdrawn, or discarded.' });
    }

    // RULE: Reuse existing negotiation record to prevent duplicate active negotiations
    let negotiation = await Negotiation.findOne({
      $or: [
        { quotation: quotation._id },
        ...(quotation.customerRequest ? [{ customerRequest: quotation.customerRequest }] : [])
      ]
    });

    if (!negotiation) {
      negotiation = new Negotiation({
        quotation: quotation._id,
        customerRequest: quotation.customerRequest || null,
        customer: quotation.customer,
        salesRep: quotation.salesRep,
        salesManager: quotation.assignedSalesManager || null,
        status: 'Active',
        messages: [],
        history: []
      });
    }

    const isAuth = await checkNegotiationAccess(req.user, negotiation, customerRequest, quotation);
    if (!isAuth) {
      return res.status(403).json({ message: 'Not authorized to reopen negotiation for this deal' });
    }

    const prevDiscount = quotation.totalDiscount;
    const proposedDisc = Number(proposedDiscountPercent || 0);

    // Apply proposed discount if items exist
    if (proposedDisc > 0 && quotation.items && quotation.items.length > 0) {
      quotation.items.forEach(item => {
        item.discountPercent = proposedDisc;
        item.finalUnitPrice = Number((item.unitPrice * (1 - proposedDisc / 100)).toFixed(2));
        item.lineTotal = Number((item.finalUnitPrice * item.quantity).toFixed(2));
      });

      let subtotal = 0;
      let totalDiscount = 0;
      quotation.items.forEach(item => {
        subtotal += item.unitPrice * item.quantity;
        totalDiscount += (item.unitPrice * (item.discountPercent / 100)) * item.quantity;
      });

      quotation.subtotal = Number(subtotal.toFixed(2));
      quotation.totalDiscount = Number(totalDiscount.toFixed(2));
      quotation.tax = Number(((subtotal - totalDiscount) * 0.18).toFixed(2));
      quotation.grandTotal = Number(((subtotal - totalDiscount) + quotation.tax).toFixed(2));
    }

    // Validate discounts & calculate risk score
    const { totalBreaches } = await validateQuotationDiscounts(quotation.items, quotation.customer);
    const riskAnalysis = await calculateRiskScore({
      items: quotation.items,
      grandTotal: quotation.grandTotal,
      totalBreaches,
      isNegotiationActive: true
    });

    quotation.riskScore = riskAnalysis.score;
    quotation.riskLevel = riskAnalysis.level;
    quotation.riskReasons = riskAnalysis.reasons;

    // Reset confirmations for reopened negotiation
    negotiation.previousDiscount = prevDiscount;
    negotiation.currentRequestedDiscount = proposedDisc;
    negotiation.customerConfirmation = { status: 'PENDING', confirmedAt: null };
    negotiation.salesRepConfirmation = { status: 'PENDING', confirmedAt: null };

    negotiation.messages.push({
      sender: req.user._id,
      senderRole: req.user.role,
      message: `[Negotiate Again] Proposing ${proposedDisc}% discount. Reason: ${message || 'Terms reopened for negotiation.'}`,
      counterDiscountPercent: proposedDisc,
      timestamp: new Date()
    });

    negotiation.history.push({
      action: 'REOPENED',
      previousDiscount: prevDiscount,
      requestedDiscount: proposedDisc,
      message: message || 'Negotiation reopened',
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      timestamp: new Date()
    });

    let approval = await Approval.findOne({ quotation: quotation._id });

    if (totalBreaches > 0 || riskAnalysis.score >= 30) {
      quotation.status = 'Pending Approval';
      quotation.approvalChainState = 'SALES_MANAGER';
      negotiation.status = 'Re-approval Required';

      if (!approval) {
        approval = new Approval({
          quotation: quotation._id,
          customerRequest: quotation.customerRequest || null,
          customer: quotation.customer,
          salesRep: quotation.salesRep,
          salesManager: quotation.assignedSalesManager || null,
          currentStep: 'SALES_MANAGER',
          riskScore: riskAnalysis.score,
          riskLevel: riskAnalysis.level,
          riskReasons: riskAnalysis.reasons,
          managerApproval: { status: 'PENDING' },
          financeApproval: { status: riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED' }
        });
      } else {
        approval.currentStep = 'SALES_MANAGER';
        approval.managerApproval.status = 'PENDING';
        approval.financeApproval.status = riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED';
      }

      approval.auditTrail.push({
        user: req.user._id,
        action: 'REOPENED',
        role: req.user.role,
        reason: `Negotiated again with ${proposedDisc}% proposal: ${message || 'Reopened'}`
      });
      await approval.save();
    } else {
      quotation.status = 'Negotiation';
      negotiation.status = 'Active';
    }

    await quotation.save();
    await negotiation.save();

    const populatedNeg = await populateNegotiationQuery(Negotiation.findById(negotiation._id));

    res.json({ quotation, negotiation: populatedNeg, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Accept negotiation terms (Closes deal when both sellerAgreed and customerAgreed are true)
// @route POST /api/negotiations/quotation/:quotationId/accept
const acceptNegotiation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.quotationId)
      .populate('customer')
      .populate('items.product');

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    let negotiation = await Negotiation.findOne({ quotation: quotation._id });
    if (!negotiation) {
      return res.status(404).json({ message: 'Negotiation thread not found' });
    }

    const isAuth = await checkNegotiationAccess(req.user, negotiation, null, quotation);
    if (!isAuth) {
      return res.status(403).json({ message: 'Not authorized to accept terms for this negotiation' });
    }

    if (negotiation.status === 'Closed' || quotation.status === 'Closed' || quotation.status === 'CLOSED' || quotation.status === 'WITHDRAWN' || quotation.status === 'DISCARDED') {
      return res.status(400).json({ message: 'Negotiation is already closed, withdrawn, or discarded.' });
    }

    const { logAudit } = require('../services/auditService');

    // If Sales Rep / Sales Manager / Admin approves revised terms
    if (req.user.role === 'SALES_REP' || req.user.role === 'SALES_MANAGER' || req.user.role === 'ADMIN') {
      const { totalBreaches, tierLimit } = await validateQuotationDiscounts(quotation.items, quotation.customer._id || quotation.customer);
      if (req.user.role === 'SALES_REP' && (totalBreaches > 0 || quotation.riskLevel === 'HIGH' || quotation.riskScore > 5)) {
        return res.status(400).json({
          message: `Proposed counter discount exceeds allowed authority limit (${tierLimit}%). Must send to Sales Manager for approval.`
        });
      }

      quotation.sellerAgreed = true;
      quotation.salesRepConfirmed = true;
      quotation.status = 'Approved';
      await quotation.save();

      negotiation.salesRepConfirmation = { status: 'CONFIRMED', confirmedAt: new Date() };
      negotiation.status = 'Approved';
      negotiation.messages.push({
        sender: req.user._id,
        senderRole: req.user.role,
        message: `${req.user.role === 'SALES_REP' ? 'Sales Representative' : 'Sales Manager'} approved revised terms and sent updated quotation to customer.`,
        timestamp: new Date()
      });
      await negotiation.save();

      await logAudit({
        recordType: 'Quotation',
        recordId: quotation._id,
        action: 'SELLER_AGREED',
        previousStatus: 'Negotiation',
        newStatus: 'Approved',
        performedBy: req.user._id,
        performerRole: req.user.role,
        comment: 'Seller approved revised negotiation terms and sent updated quotation'
      });

      // If customer has ALREADY agreed
      if (quotation.customerAgreed) {
        const { finalizeClosedDeal } = require('../services/dealClosureService');
        const closedResult = await finalizeClosedDeal({
          quotationId: quotation._id,
          userId: req.user._id,
          userRole: req.user.role
        });

        const populatedNeg = await populateNegotiationQuery(Negotiation.findById(negotiation._id));
        return res.json({
          message: 'Both parties agreed! Deal CLOSED successfully.',
          quotation: closedResult.quotation,
          negotiation: populatedNeg,
          isClosed: true,
          order: closedResult.order,
          invoice: closedResult.invoice,
          fulfillment: closedResult.fulfillment,
          subscriptions: closedResult.subscriptions
        });
      }

      const populatedNeg = await populateNegotiationQuery(Negotiation.findById(negotiation._id));
      return res.json({
        message: 'Seller has approved revised terms. Updated quotation automatically sent to Customer.',
        quotation,
        negotiation: populatedNeg,
        isClosed: false
      });
    }

    // Customer accepts updated terms
    if (req.user.role === 'CUSTOMER') {
      quotation.customerAgreed = true;
      quotation.customerConfirmed = true;
      quotation.acceptedBy = req.user._id;
      quotation.acceptedAt = new Date();
      await quotation.save();

      negotiation.customerConfirmation = { status: 'CONFIRMED', confirmedAt: new Date() };
      negotiation.messages.push({
        sender: req.user._id,
        senderRole: req.user.role,
        message: 'Customer accepted the updated terms.',
        timestamp: new Date()
      });
      await negotiation.save();

      await logAudit({
        recordType: 'Quotation',
        recordId: quotation._id,
        action: 'CUSTOMER_ACCEPTED',
        previousStatus: quotation.status,
        newStatus: 'Closed',
        performedBy: req.user._id,
        performerRole: req.user.role,
        comment: 'Customer accepted updated quotation terms'
      });

      // Seller already agreed when approving terms -> CLOSE DEAL IMMEDIATELY!
      const { finalizeClosedDeal } = require('../services/dealClosureService');
      const closedResult = await finalizeClosedDeal({
        quotationId: quotation._id,
        userId: req.user._id,
        userRole: req.user.role
      });

      const populatedNeg = await populateNegotiationQuery(Negotiation.findById(negotiation._id));

      return res.json({
        message: 'Deal finalized & CLOSED! Both parties agreed to the final terms.',
        quotation: closedResult.quotation,
        negotiation: populatedNeg,
        isClosed: true,
        order: closedResult.order,
        invoice: closedResult.invoice,
        fulfillment: closedResult.fulfillment,
        subscriptions: closedResult.subscriptions
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Representative escalates Medium/High risk negotiation to Sales Manager
// @route POST /api/negotiations/quotation/:quotationId/escalate-manager
const escalateNegotiationToManager = async (req, res) => {
  try {
    const { reason } = req.body;
    const quotation = await Quotation.findById(req.params.quotationId);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    let negotiation = await Negotiation.findOne({ quotation: quotation._id });
    if (!negotiation) {
      negotiation = new Negotiation({
        quotation: quotation._id,
        customer: quotation.customer,
        salesRep: quotation.salesRep,
        salesManager: quotation.assignedSalesManager || null,
        status: 'Open',
        messages: []
      });
    }

    const isAuth = await checkNegotiationAccess(req.user, negotiation, null, quotation);
    if (!isAuth) {
      return res.status(403).json({ message: 'Not authorized to escalate this negotiation' });
    }

    if (quotation.status === 'Closed' || quotation.status === 'CLOSED' || quotation.status === 'WITHDRAWN' || quotation.status === 'DISCARDED') {
      return res.status(400).json({ message: 'Cannot escalate a closed, withdrawn, or discarded deal.' });
    }

    const { tierLimit } = await validateQuotationDiscounts(quotation.items, quotation.customer);

    quotation.status = 'Pending Approval';
    quotation.approvalChainState = 'SALES_MANAGER';
    negotiation.status = 'PENDING_MANAGER_APPROVAL';

    negotiation.messages.push({
      sender: req.user._id,
      senderRole: req.user.role,
      message: `Escalated to Sales Manager for approval. Reason: ${reason || 'Discount/Risk score exceeds Sales Rep authority.'}`,
      timestamp: new Date()
    });

    // Create or update Approval record with complete context for Sales Manager
    let approval = await Approval.findOne({ quotation: quotation._id });
    if (!approval) {
      approval = new Approval({
        quotation: quotation._id,
        customerRequest: quotation.customerRequest || null,
        negotiation: negotiation._id,
        customer: quotation.customer,
        salesRep: quotation.salesRep,
        salesManager: quotation.assignedSalesManager || null,
        requestedDiscount: negotiation.currentRequestedDiscount || 0,
        allowedDiscount: tierLimit || 10,
        currentStep: 'SALES_MANAGER',
        riskScore: quotation.riskScore,
        riskLevel: quotation.riskLevel,
        riskReasons: quotation.riskReasons,
        managerApproval: { status: 'PENDING' },
        financeApproval: { status: quotation.riskLevel === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED' },
        auditTrail: [{
          user: req.user._id,
          action: 'ESCALATED',
          role: req.user.role,
          reason: reason || 'Escalated negotiation proposal to Sales Manager for signoff'
        }]
      });
    } else {
      approval.customerRequest = quotation.customerRequest || approval.customerRequest;
      approval.negotiation = negotiation._id;
      approval.customer = quotation.customer;
      approval.requestedDiscount = negotiation.currentRequestedDiscount || approval.requestedDiscount;
      approval.allowedDiscount = tierLimit || approval.allowedDiscount;
      approval.currentStep = 'SALES_MANAGER';
      approval.managerApproval.status = 'PENDING';
      approval.financeApproval.status = quotation.riskLevel === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED';
      approval.auditTrail.push({
        user: req.user._id,
        action: 'ESCALATED',
        role: req.user.role,
        reason: reason || 'Escalated negotiation proposal to Sales Manager for signoff'
      });
    }

    await quotation.save();
    await negotiation.save();
    await approval.save();

    const populatedNeg = await populateNegotiationQuery(Negotiation.findById(negotiation._id));

    res.json({ message: 'Negotiation sent to Sales Manager for approval!', quotation, negotiation: populatedNeg, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get negotiations for Sales Rep's assigned customer quotations
// @route GET /api/negotiations/sales-rep
const getSalesRepNegotiations = async (req, res) => {
  try {
    const teamReps = await User.find({ salesManagerId: req.user._id }).select('_id');
    const repIds = [req.user._id, ...teamReps.map(r => r._id)];

    const negotiations = await populateNegotiationQuery(
      Negotiation.find({
        $or: [
          { salesRep: { $in: repIds } },
          { salesManager: req.user._id }
        ],
        status: { $ne: 'DISCARDED' }
      }).sort('-updatedAt')
    );

    res.json(negotiations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get negotiation thread by Negotiation ID
// @route GET /api/negotiations/:id
const getNegotiationById = async (req, res) => {
  try {
    const negotiation = await populateNegotiationQuery(
      Negotiation.findById(req.params.id)
    );

    if (!negotiation) {
      return res.status(404).json({ message: 'Negotiation thread not found' });
    }

    const isAuth = await checkNegotiationAccess(req.user, negotiation, negotiation.customerRequest, negotiation.quotation);
    if (!isAuth) {
      return res.status(403).json({ message: 'Not authorized to view this negotiation thread' });
    }

    res.json(negotiation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Add message or counter discount proposal by Negotiation ID
// @route POST /api/negotiations/:id/message
const addNegotiationMessageById = async (req, res) => {
  try {
    const { itemIndex, message, counterDiscountPercent } = req.body;

    const negotiation = await Negotiation.findById(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ message: 'Negotiation thread not found' });
    }

    const isAuth = await checkNegotiationAccess(req.user, negotiation, null, null);
    if (!isAuth) {
      return res.status(403).json({ message: 'Not authorized to send messages in this negotiation' });
    }

    if (negotiation.status === 'Closed' || negotiation.status === 'CLOSED') {
      return res.status(400).json({ message: 'Deal is closed & finalized. No further messages can be sent.' });
    }

    if (counterDiscountPercent !== undefined && counterDiscountPercent !== null && counterDiscountPercent !== '') {
      const proposedDisc = Number(counterDiscountPercent);
      if (req.user.role === 'CUSTOMER' || req.user.role === 'SALES_REP') {
        if (negotiation.managerMaxAllowedDiscount !== null && negotiation.managerMaxAllowedDiscount !== undefined) {
          if (proposedDisc > negotiation.managerMaxAllowedDiscount) {
            return res.status(400).json({
              message: `Proposed discount (${proposedDisc}%) exceeds the Sales Manager's authorized maximum limit of ${negotiation.managerMaxAllowedDiscount}%.`
            });
          }
        }
      }
    }

    let parsedDisc = counterDiscountPercent !== undefined && counterDiscountPercent !== '' && counterDiscountPercent !== null ? Number(counterDiscountPercent) : null;

    negotiation.messages.push({
      sender: req.user._id,
      senderRole: req.user.role,
      itemIndex: itemIndex !== undefined && itemIndex !== null ? Number(itemIndex) : null,
      message: message || '',
      counterDiscountPercent: parsedDisc,
      timestamp: new Date()
    });

    if (parsedDisc !== null) {
      negotiation.currentRequestedDiscount = parsedDisc;
      negotiation.history.push({
        action: req.user.role === 'CUSTOMER' ? 'COUNTER_OFFER' : 'PROPOSED',
        requestedDiscount: parsedDisc,
        message: message || 'Counter discount proposed',
        updatedBy: req.user._id,
        updatedByRole: req.user.role,
        timestamp: new Date()
      });
    }

    // If linked to quotation, recalculate totals & risk
    let triggerReapproval = false;
    let quotation = null;

    if (negotiation.quotation) {
      quotation = await Quotation.findById(negotiation.quotation);
      if (quotation) {
        if (parsedDisc !== null && quotation.items && quotation.items.length > 0) {
          let targetIdx = itemIndex;
          if (targetIdx === undefined || targetIdx === null) {
            if (quotation.items.length === 1) targetIdx = 0;
          }

          if (targetIdx !== undefined && targetIdx !== null && quotation.items[targetIdx]) {
            quotation.items[targetIdx].discountPercent = parsedDisc;
          } else {
            quotation.items.forEach(i => {
              i.discountPercent = parsedDisc;
            });
          }

          let subtotal = 0;
          let totalDiscount = 0;
          quotation.items.forEach(item => {
            subtotal += item.unitPrice * item.quantity;
            totalDiscount += (item.unitPrice * (item.discountPercent / 100)) * item.quantity;
            item.finalUnitPrice = Number((item.unitPrice * (1 - item.discountPercent / 100)).toFixed(2));
            item.lineTotal = Number((item.finalUnitPrice * item.quantity).toFixed(2));
          });

          quotation.subtotal = Number(subtotal.toFixed(2));
          quotation.totalDiscount = Number(totalDiscount.toFixed(2));
          quotation.tax = Number(((subtotal - totalDiscount) * 0.18).toFixed(2));
          quotation.grandTotal = Number(((subtotal - totalDiscount) + quotation.tax).toFixed(2));

          const { totalBreaches } = await validateQuotationDiscounts(quotation.items, quotation.customer);
          const riskAnalysis = await calculateRiskScore({
            items: quotation.items,
            grandTotal: quotation.grandTotal,
            totalBreaches,
            isNegotiationActive: true
          });

          quotation.riskScore = riskAnalysis.score;
          quotation.riskLevel = riskAnalysis.level;
          quotation.riskReasons = riskAnalysis.reasons;

          if (totalBreaches > 0 || riskAnalysis.score >= 30) {
            triggerReapproval = true;
            quotation.status = 'Pending Approval';
            quotation.approvalChainState = 'SALES_MANAGER';
            negotiation.status = 'Re-approval Required';

            let approval = await Approval.findOne({ quotation: quotation._id });
            if (!approval) {
              approval = new Approval({
                quotation: quotation._id,
                customerRequest: quotation.customerRequest || null,
                customer: quotation.customer,
                salesRep: quotation.salesRep,
                salesManager: quotation.assignedSalesManager || null,
                currentStep: 'SALES_MANAGER',
                riskScore: riskAnalysis.score,
                riskLevel: riskAnalysis.level,
                riskReasons: riskAnalysis.reasons,
                managerApproval: { status: 'PENDING' },
                financeApproval: { status: riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED' }
              });
            } else {
              approval.currentStep = 'SALES_MANAGER';
              approval.managerApproval.status = 'PENDING';
              approval.financeApproval.status = riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED';
            }
            await approval.save();
          }

          await quotation.save();
        }
      }
    }

    await negotiation.save();

    const populatedNeg = await populateNegotiationQuery(Negotiation.findById(negotiation._id));

    res.json(populatedNeg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Customer or Rep terminates/withdraws negotiation thread
// @route POST /api/negotiations/:id/withdraw
const withdrawNegotiation = async (req, res) => {
  try {
    const negotiation = await Negotiation.findById(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ message: 'Negotiation thread not found' });
    }

    if (negotiation.status === 'Closed') {
      return res.status(400).json({ message: 'Negotiation is already closed' });
    }

    const isAuth = await checkNegotiationAccess(req.user, negotiation, null, null);
    if (!isAuth) {
      return res.status(403).json({ message: 'Not authorized to withdraw this negotiation' });
    }

    negotiation.status = 'Closed';
    negotiation.rejectionReason = `${req.user.role === 'CUSTOMER' ? 'Customer' : 'User'} closed negotiation thread without agreement.`;

    negotiation.messages.push({
      sender: req.user._id,
      senderRole: req.user.role,
      message: `🚫 Negotiation thread terminated & closed by ${req.user.role === 'CUSTOMER' ? 'Customer' : 'Sales Representative'}.`,
      timestamp: new Date()
    });

    await negotiation.save();

    if (negotiation.customerRequest) {
      await CustomerRequest.findByIdAndUpdate(negotiation.customerRequest, { status: 'WITHDRAWN' });
    }

    if (negotiation.quotation) {
      await Quotation.findByIdAndUpdate(negotiation.quotation, { status: 'DISCARDED' });
    }

    const populatedNeg = await populateNegotiationQuery(Negotiation.findById(negotiation._id));

    res.json({ message: 'Negotiation thread closed & deal withdrawn successfully.', negotiation: populatedNeg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNegotiationByQuotation,
  getNegotiationByCustomerRequest,
  addNegotiationMessage,
  getNegotiationById,
  addNegotiationMessageById,
  getCustomerNegotiations,
  getSalesRepNegotiations,
  reopenNegotiation,
  acceptNegotiation,
  escalateNegotiationToManager,
  withdrawNegotiation
};


