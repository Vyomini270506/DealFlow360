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

    if (search) {
      const s = search.toLowerCase();
      quotations = quotations.filter(q => 
        q.quoteNumber.toLowerCase().includes(s) ||
        (q.customer && q.customer.company.toLowerCase().includes(s)) ||
        (q.customer && q.customer.name.toLowerCase().includes(s))
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
    const { customerId, items, notes } = req.body;

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

    // Calculate transparent Risk Score
    const riskAnalysis = await calculateRiskScore({
      items: processedItems,
      grandTotal,
      totalBreaches,
      isNegotiationActive: false
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
      riskScore: riskAnalysis.score,
      riskLevel: riskAnalysis.level,
      riskReasons: riskAnalysis.reasons,
      approvalChainState: riskAnalysis.requiredApproval === 'NONE' ? 'NONE' : 'SALES_MANAGER',
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

    // Re-evaluate risk score & discount validator
    const { totalBreaches } = await validateQuotationDiscounts(quotation.items, quotation.customer);
    const riskAnalysis = await calculateRiskScore({
      items: quotation.items,
      grandTotal: quotation.grandTotal,
      totalBreaches,
      isNegotiationActive: quotation.status === 'Negotiation'
    });

    quotation.riskScore = riskAnalysis.score;
    quotation.riskLevel = riskAnalysis.level;
    quotation.riskReasons = riskAnalysis.reasons;

    if (riskAnalysis.requiredApproval === 'NONE') {
      quotation.status = 'Approved';
      quotation.approvalChainState = 'APPROVED';
    } else {
      quotation.status = 'Pending Approval';
      quotation.approvalChainState = 'SALES_MANAGER';
    }

    await quotation.save();

    // Create or update Approval document
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
        financeApproval: { status: riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED' },
        auditTrail: [{
          user: req.user._id,
          action: 'SUBMITTED',
          role: req.user.role,
          reason: 'Quotation submitted for approval workflow'
        }]
      });
    } else {
      approval.currentStep = 'SALES_MANAGER';
      approval.managerApproval.status = 'PENDING';
      approval.financeApproval.status = riskAnalysis.level === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED';
      approval.auditTrail.push({
        user: req.user._id,
        action: 'SUBMITTED',
        role: req.user.role,
        reason: 'Quotation re-submitted for approval'
      });
    }

    await approval.save();

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

    if (req.user.role === 'CUSTOMER') {
      const userCustId = req.user.customerId?._id ? req.user.customerId._id.toString() : req.user.customerId?.toString();
      if (!userCustId || quotation.customer.toString() !== userCustId) {
        return res.status(403).json({ message: 'Not authorized to accept this quotation' });
      }
    }

    quotation.status = 'Confirmed';
    quotation.approvalChainState = 'APPROVED';
    quotation.acceptedBy = req.user._id;
    quotation.acceptedAt = new Date();
    await quotation.save();

    res.json({ message: 'Quotation accepted successfully!', quotation });
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

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  submitQuotation,
  acceptQuotation,
  rejectQuotation
};
