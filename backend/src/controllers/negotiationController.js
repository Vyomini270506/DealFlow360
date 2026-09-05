const Negotiation = require('../models/Negotiation');
const Quotation = require('../models/Quotation');
const Approval = require('../models/Approval');
const { validateQuotationDiscounts } = require('../services/discountValidator');
const { calculateRiskScore } = require('../services/riskEngine');

// @desc Get negotiation thread by Quotation ID
// @route GET /api/negotiations/quotation/:quotationId
const getNegotiationByQuotation = async (req, res) => {
  try {
    let negotiation = await Negotiation.findOne({ quotation: req.params.quotationId })
      .populate('customer', 'name company')
      .populate('salesRep', 'name email')
      .populate('messages.sender', 'name role avatar');

    if (!negotiation) {
      const quotation = await Quotation.findById(req.params.quotationId);
      if (!quotation) {
        return res.status(404).json({ message: 'Quotation not found' });
      }

      negotiation = new Negotiation({
        quotation: quotation._id,
        customer: quotation.customer,
        salesRep: quotation.salesRep,
        status: 'Open',
        messages: []
      });
      await negotiation.save();
    }

    res.json(negotiation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Add message or counter discount proposal
// @route POST /api/negotiations/quotation/:quotationId/message
const addNegotiationMessage = async (req, res) => {
  try {
    const { itemIndex, message, counterDiscountPercent } = req.body;

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
        status: 'Open',
        messages: []
      });
    }

    negotiation.messages.push({
      sender: req.user._id,
      senderRole: req.user.role,
      itemIndex: itemIndex !== undefined ? itemIndex : null,
      message,
      counterDiscountPercent: counterDiscountPercent !== undefined ? counterDiscountPercent : null,
      timestamp: new Date()
    });

    // If customer offered a counter discount on a line item, update quotation item discount & check limits!
    let triggerReapproval = false;

    if (counterDiscountPercent !== undefined && counterDiscountPercent !== null && itemIndex !== undefined) {
      if (quotation.items[itemIndex]) {
        quotation.items[itemIndex].discountPercent = Number(counterDiscountPercent);
      }

      // Re-validate discounts against rules
      const { totalBreaches } = await validateQuotationDiscounts(quotation.items, quotation.customer);

      // Re-calculate totals
      let subtotal = 0;
      let totalDiscount = 0;
      quotation.items.forEach(item => {
        subtotal += item.unitPrice * item.quantity;
        totalDiscount += (item.unitPrice * (item.discountPercent / 100)) * item.quantity;
        item.finalUnitPrice = item.unitPrice * (1 - item.discountPercent / 100);
        item.lineTotal = item.finalUnitPrice * item.quantity;
      });

      quotation.subtotal = Number(subtotal.toFixed(2));
      quotation.totalDiscount = Number(totalDiscount.toFixed(2));
      quotation.tax = Number(((subtotal - totalDiscount) * 0.18).toFixed(2));
      quotation.grandTotal = Number(((subtotal - totalDiscount) + quotation.tax).toFixed(2));

      // Re-calculate risk score
      const riskAnalysis = await calculateRiskScore({
        items: quotation.items,
        grandTotal: quotation.grandTotal,
        totalBreaches,
        isNegotiationActive: true
      });

      quotation.riskScore = riskAnalysis.score;
      quotation.riskLevel = riskAnalysis.level;
      quotation.riskReasons = riskAnalysis.reasons;

      // AUTOMATIC WORKFLOW RULE:
      // If customer negotiated discount beyond allowed limit (totalBreaches > 0) or HIGH risk:
      // Automatically send back to Pending Approval!
      if (totalBreaches > 0 || riskAnalysis.score >= 30) {
        triggerReapproval = true;
        quotation.status = 'Pending Approval';
        quotation.approvalChainState = 'SALES_MANAGER';
        negotiation.status = 'Re-approval Required';

        // Update Approval Record
        let approval = await Approval.findOne({ quotation: quotation._id });
        if (!approval) {
          approval = new Approval({
            quotation: quotation._id,
            salesRep: quotation.salesRep,
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
          reason: `Customer counter-offer of ${counterDiscountPercent}% triggered re-approval workflow.`
        });

        await approval.save();
      }
    }

    if (quotation.status === 'Draft' || quotation.status === 'Approved') {
      if (!triggerReapproval) {
        quotation.status = 'Negotiation';
      }
    }

    await quotation.save();
    await negotiation.save();

    res.json({ negotiation, quotation, triggerReapproval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get customer negotiation corner details
// @route GET /api/negotiations/customer-corner
const getCustomerNegotiations = async (req, res) => {
  try {
    const customerId = req.user.customerId;
    if (!customerId) {
      return res.json([]);
    }

    const negotiations = await Negotiation.find({ customer: customerId })
      .populate({
        path: 'quotation',
        populate: [
          { path: 'salesRep', select: 'name email role' },
          { path: 'items.product', select: 'name unitPrice' }
        ]
      })
      .populate('salesRep', 'name email role')
      .populate('messages.sender', 'name role')
      .populate('history.updatedBy', 'name role');

    res.json(negotiations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Customer reopens a rejected negotiation with a new proposed discount & reason
// @route POST /api/negotiations/reopen
const reopenNegotiation = async (req, res) => {
  try {
    const { quotationId, proposedDiscountPercent, message } = req.body;

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // If an existing negotiation is Rejected or Closed, close it and start a new attempt
    let nextAttempt = 1;
    let existingNegotiation = await Negotiation.findOne({ quotation: quotation._id });
    if (existingNegotiation) {
      nextAttempt = (existingNegotiation.attempt || 1) + 1;
      existingNegotiation.status = 'Closed';
      await existingNegotiation.save();
    }

    negotiation = new Negotiation({
      quotation: quotation._id,
      customerRequest: quotation.customerRequest || null,
      customer: quotation.customer,
      salesRep: quotation.salesRep,
      attempt: nextAttempt,
      status: 'Re-approval Required',
      previousDiscount: prevDiscount,
      currentRequestedDiscount: Number(proposedDiscountPercent),
      messages: [{
        sender: req.user._id,
        senderRole: req.user.role,
        message: `[Reopened Negotiation Attempt #${nextAttempt}] Proposing ${proposedDiscountPercent}% discount. Reason: ${message}`,
        counterDiscountPercent: Number(proposedDiscountPercent),
        timestamp: new Date()
      }],
      history: [{
        action: 'REOPENED',
        previousDiscount: prevDiscount,
        requestedDiscount: Number(proposedDiscountPercent),
        message,
        updatedBy: req.user._id,
        updatedByRole: req.user.role,
        timestamp: new Date()
      }]
    });

    // Update approval record
    let approval = await Approval.findOne({ quotation: quotation._id });
    if (!approval) {
      approval = new Approval({
        quotation: quotation._id,
        customerRequest: quotation.customerRequest || null,
        salesRep: quotation.salesRep,
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
      reason: `Customer reopened negotiation (Attempt #${nextAttempt}) with ${proposedDiscountPercent}% counter proposal: ${message}`
    });

    await quotation.save();
    await negotiation.save();
    await approval.save();

    res.json({ quotation, negotiation, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// @desc Sales Representative accepts a low-risk negotiation counter-offer directly
// @route POST /api/negotiations/quotation/:quotationId/accept
const acceptNegotiation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.quotationId);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (req.user.role === 'SALES_REP' && quotation.salesRep && quotation.salesRep.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept negotiation on this quotation' });
    }

    let negotiation = await Negotiation.findOne({ quotation: quotation._id });
    if (!negotiation) {
      return res.status(404).json({ message: 'Negotiation thread not found' });
    }

    // Dynamic Discount Authority Check via discountValidator
    const { totalBreaches, breachSummary, tierLimit } = await validateQuotationDiscounts(quotation.items, quotation.customer);

    if (totalBreaches > 0 || quotation.riskLevel === 'HIGH' || quotation.riskScore >= 60) {
      return res.status(400).json({ 
        message: `Proposed counter discount exceeds allowed authority limit (${tierLimit}%). Must send to Sales Manager for approval.` 
      });
    }

    quotation.status = 'Confirmed';
    quotation.approvalChainState = 'APPROVED';
    quotation.acceptedBy = req.user._id;
    quotation.acceptedAt = new Date();

    negotiation.status = 'Accepted';
    negotiation.approvedBy = req.user._id;
    negotiation.approvedAt = new Date();
    
    negotiation.messages.push({
      sender: req.user._id,
      senderRole: req.user.role,
      message: 'Sales Representative accepted counter-offer negotiation proposal.',
      timestamp: new Date()
    });

    await quotation.save();
    await negotiation.save();

    res.json({ message: 'Negotiation accepted successfully!', quotation, negotiation });
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

    if (req.user.role === 'SALES_REP' && quotation.salesRep && quotation.salesRep.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to escalate this negotiation' });
    }

    let negotiation = await Negotiation.findOne({ quotation: quotation._id });
    if (!negotiation) {
      negotiation = new Negotiation({
        quotation: quotation._id,
        customer: quotation.customer,
        salesRep: quotation.salesRep,
        status: 'Open',
        messages: []
      });
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

    res.json({ message: 'Negotiation sent to Sales Manager for approval!', quotation, negotiation, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get negotiations for Sales Rep's assigned customer quotations
// @route GET /api/negotiations/sales-rep
const getSalesRepNegotiations = async (req, res) => {
  try {
    const negotiations = await Negotiation.find({ salesRep: req.user._id })
      .populate({
        path: 'quotation',
        populate: [
          { path: 'customer', select: 'name company tier email' },
          { path: 'items.product', select: 'name category unitPrice' }
        ]
      })
      .populate('customer', 'name company tier email')
      .populate('messages.sender', 'name role')
      .populate('history.updatedBy', 'name role')
      .sort('-updatedAt');

    res.json(negotiations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNegotiationByQuotation,
  addNegotiationMessage,
  getCustomerNegotiations,
  getSalesRepNegotiations,
  reopenNegotiation,
  acceptNegotiation,
  escalateNegotiationToManager
};
