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

    const prevDiscount = quotation.totalDiscount;

    // Apply proposed discount to items
    quotation.items.forEach(item => {
      item.discountPercent = Number(proposedDiscountPercent);
      item.finalUnitPrice = item.unitPrice * (1 - item.discountPercent / 100);
      item.lineTotal = item.finalUnitPrice * item.quantity;
    });

    const { totalBreaches } = await validateQuotationDiscounts(quotation.items, quotation.customer);

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

    const riskAnalysis = await calculateRiskScore({
      items: quotation.items,
      grandTotal: quotation.grandTotal,
      totalBreaches,
      isNegotiationActive: true
    });

    quotation.riskScore = riskAnalysis.score;
    quotation.riskLevel = riskAnalysis.level;
    quotation.riskReasons = riskAnalysis.reasons;
    quotation.status = 'Pending Approval';
    quotation.approvalChainState = 'SALES_MANAGER';

    // Record history entry
    negotiation.status = 'Re-approval Required';
    negotiation.previousDiscount = prevDiscount;
    negotiation.currentRequestedDiscount = Number(proposedDiscountPercent);
    negotiation.history.push({
      action: 'REOPENED',
      previousDiscount: prevDiscount,
      requestedDiscount: Number(proposedDiscountPercent),
      message,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      timestamp: new Date()
    });

    negotiation.messages.push({
      sender: req.user._id,
      senderRole: req.user.role,
      message: `[Reopened Negotiation] Proposing ${proposedDiscountPercent}% discount. Reason: ${message}`,
      counterDiscountPercent: Number(proposedDiscountPercent),
      timestamp: new Date()
    });

    // Update approval record
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
      action: 'REOPENED',
      role: req.user.role,
      reason: `Customer reopened negotiation with ${proposedDiscountPercent}% counter proposal: ${message}`
    });

    await quotation.save();
    await negotiation.save();
    await approval.save();

    res.json({ quotation, negotiation, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNegotiationByQuotation,
  addNegotiationMessage,
  getCustomerNegotiations,
  reopenNegotiation
};
