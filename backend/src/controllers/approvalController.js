const Approval = require('../models/Approval');
const Quotation = require('../models/Quotation');
const User = require('../models/User');
const { allocateFulfillmentStock } = require('../services/fulfillmentService');

// @desc Get pending approvals based on active user role
// @route GET /api/approvals
const getApprovals = async (req, res) => {
  try {
    let filter = {};

    if (req.query.all === 'true' || req.query.status) {
      if (req.query.status) filter.status = req.query.status;
      if (req.user.role === 'SALES_MANAGER') {
        const teamReps = await User.find({ salesManagerId: req.user._id }).select('_id');
        const repIds = teamReps.map(r => r._id);
        filter.$or = [
          { salesManager: req.user._id },
          { salesRep: { $in: repIds } }
        ];
      } else if (req.user.role === 'FINANCE_OPERATIONS') {
        // Finance can see high risk or finance operation approvals
      } else if (req.user.role === 'SALES_REP') {
        filter.salesRep = req.user._id;
      }
    } else if (req.user.role === 'SALES_MANAGER') {
      const teamReps = await User.find({ salesManagerId: req.user._id }).select('_id');
      const repIds = teamReps.map(r => r._id);
      
      filter = {
        $or: [
          { salesManager: req.user._id },
          { salesRep: { $in: repIds } }
        ],
        currentStep: 'SALES_MANAGER',
        'managerApproval.status': 'PENDING'
      };
    } else if (req.user.role === 'FINANCE_OPERATIONS') {
      filter = {
        currentStep: 'FINANCE_OPERATIONS',
        'financeApproval.status': 'PENDING',
        riskLevel: 'HIGH'
      };
    } else if (req.user.role === 'ADMIN') {
      // Admin sees all approvals
    } else {
      filter = { salesRep: req.user._id };
    }

    const approvals = await Approval.find(filter)
      .populate({
        path: 'quotation',
        populate: [
          { path: 'customer' },
          { path: 'salesRep', select: 'name email' },
          { path: 'items.product' }
        ]
      })
      .populate({
        path: 'customerRequest',
        populate: [
          { path: 'customer' },
          { path: 'items.product' }
        ]
      })
      .populate('customer')
      .populate('salesRep', 'name email role')
      .populate('salesManager', 'name email')
      .populate('managerApproval.approvedBy', 'name')
      .populate('financeApproval.approvedBy', 'name')
      .sort('-updatedAt');

    res.json(approvals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Process approval action (Approve, Reject, Request Changes)
// @route POST /api/approvals/:id/action
const processApprovalAction = async (req, res) => {
  try {
    const { action, reason = '' } = req.body; // action: 'APPROVE', 'REJECT', 'RETURN_FOR_CHANGES'
    
    const approval = await Approval.findById(req.params.id);
    if (!approval) {
      return res.status(404).json({ message: 'Approval record not found' });
    }

    const CustomerRequest = require('../models/CustomerRequest');
    const customerRequest = approval.customerRequest ? await CustomerRequest.findById(approval.customerRequest) : null;
    const quotation = approval.quotation ? await Quotation.findById(approval.quotation) : null;

    if ((quotation && (quotation.status === 'Closed' || quotation.status === 'CLOSED')) || 
        (customerRequest && (customerRequest.status === 'Closed' || customerRequest.status === 'CLOSED'))) {
      return res.status(400).json({ message: 'Deal is closed & finalized by both Customer and Sales Representative. No further changes can be made.' });
    }

    // Security & Role Validation
    // Security & Role Validation: Finance Operator is NOT an approver
    if (req.user.role === 'FINANCE_OPERATIONS') {
      return res.status(403).json({
        message: 'Finance Operators provide advisory financial reviews (SUPPORT / DO NOT SUPPORT / SUGGEST CHANGES / COMMENT). Only Sales Managers have final approval authority.'
      });
    }

    if (req.user.role !== 'SALES_MANAGER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only Sales Managers can perform approval or rejection decisions.' });
    }

    if (req.user.role === 'SALES_MANAGER') {
      const isDirectManager = approval.salesManager && approval.salesManager.toString() === req.user._id.toString();
      const repUser = await User.findById(approval.salesRep);
      const isTeamManager = repUser && repUser.salesManagerId && repUser.salesManagerId.toString() === req.user._id.toString();
      if (!isDirectManager && !isTeamManager && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'You are not authorized to approve requests assigned to another Sales Manager' });
      }
    }

    if (action === 'APPROVE') {
      approval.managerApproval.status = 'APPROVED';
      approval.managerApproval.approvedBy = req.user._id;
      approval.managerApproval.comment = reason;
      approval.managerApproval.actionDate = new Date();

      approval.auditTrail.push({
        user: req.user._id,
        action: 'APPROVED_BY_MANAGER',
        role: req.user.role,
        reason
      });

      approval.currentStep = 'COMPLETED';

      if (customerRequest) {
        customerRequest.status = 'Approved_Manager';
        customerRequest.managerComment = reason || 'Approved by Sales Manager';
        await customerRequest.save();

        const { generateQuotationFromApprovedRequest } = require('../services/quotationGenerator');
        await generateQuotationFromApprovedRequest({
          customerRequest,
          approvedByUserId: req.user._id,
          userRole: req.user.role
        });
      }

      const Negotiation = require('../models/Negotiation');
      let negotiation = approval.negotiation ? await Negotiation.findById(approval.negotiation) : null;
      if (!negotiation && quotation) {
        negotiation = await Negotiation.findOne({ quotation: quotation._id });
      }
      if (!negotiation && customerRequest) {
        negotiation = await Negotiation.findOne({ customerRequest: customerRequest._id });
      }

      const effectiveMaxDisc = req.body.maxAllowedDiscount !== undefined && req.body.maxAllowedDiscount !== null 
        ? Number(req.body.maxAllowedDiscount) 
        : (approval.allowedDiscount || null);

      if (negotiation) {
        if (effectiveMaxDisc !== null) {
          negotiation.managerMaxAllowedDiscount = effectiveMaxDisc;
        }
        if (reason) {
          negotiation.messages.push({
            sender: req.user._id,
            senderRole: req.user.role,
            message: `[Sales Manager Guidance] Authorized max discount: ${effectiveMaxDisc !== null ? effectiveMaxDisc + '%' : 'Standard Tier Limit'}. Note: ${reason}`,
            timestamp: new Date()
          });
        }
        await negotiation.save();
      }

      if (quotation) {
        quotation.approvalChainState = 'APPROVED';
        if (negotiation && (negotiation.status === 'Active' || negotiation.status === 'Open')) {
          quotation.status = 'Negotiation';
        } else {
          quotation.status = 'Approved';
        }
        await quotation.save();
      }
    } else if (action === 'REJECT') {
      approval.managerApproval.status = 'REJECTED';
      approval.currentStep = 'REJECTED';

      approval.auditTrail.push({
        user: req.user._id,
        action: 'REJECTED',
        role: req.user.role,
        reason
      });

      if (customerRequest) {
        customerRequest.status = 'Rejected_Manager';
        customerRequest.managerComment = reason || 'Rejected by Sales Manager';
        await customerRequest.save();
      }

      if (quotation) {
        quotation.approvalChainState = 'REJECTED';
        quotation.status = 'Rejected';
        await quotation.save();
      }
    } else if (action === 'RETURN_FOR_CHANGES' || action === 'REQUEST_CHANGES') {
      approval.managerApproval.status = 'NEGOTIATION_REQUIRED';
      approval.currentStep = 'NEGOTIATION_REQUIRED';

      approval.auditTrail.push({
        user: req.user._id,
        action: 'RETURNED_FOR_CHANGES',
        role: req.user.role,
        reason
      });

      if (customerRequest) {
        customerRequest.status = 'Negotiation_Required';
        customerRequest.managerComment = reason || 'Sales Manager requested negotiation/changes.';
        await customerRequest.save();
      }

      if (quotation) {
        quotation.status = 'Draft';
        await quotation.save();
      }
    }

    await approval.save();

    // If quotation became Approved, auto-initialize Fulfillment Allocation
    if (quotation && quotation.status === 'Approved') {
      await allocateFulfillmentStock(quotation);
    }

    res.json({ quotation, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Record advisory financial review/opinion (SUPPORT / DO_NOT_SUPPORT / SUGGEST_CHANGES / COMMENT)
// @route POST /api/approvals/:id/finance-opinion
const recordFinanceOpinion = async (req, res) => {
  try {
    const { decision, comment = '' } = req.body;
    const approval = await Approval.findById(req.params.id);

    if (!approval) {
      return res.status(404).json({ message: 'Approval record not found' });
    }

    if (req.user.role !== 'FINANCE_OPERATIONS' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only Finance/Operations role can submit financial reviews' });
    }

    approval.financeApproval = {
      status: decision === 'SUPPORT' ? 'APPROVED' : (decision === 'DO_NOT_SUPPORT' ? 'REJECTED' : 'SUGGEST_CHANGES'),
      approvedBy: req.user._id,
      comment: comment || '',
      actionDate: new Date()
    };

    approval.auditTrail.push({
      user: req.user._id,
      action: decision === 'SUPPORT' ? 'APPROVED_BY_FINANCE' : 'FINANCE_OPINION_ADDED',
      role: req.user.role,
      reason: `Finance Opinion [${decision}]: ${comment || 'Financial review recorded'}`
    });

    // Advisory review step complete; keeps current step with Sales Manager for final decision
    approval.currentStep = 'SALES_MANAGER';
    await approval.save();

    res.json({
      message: `Finance opinion '${decision}' recorded successfully. Returned to Sales Manager for final approval decision.`,
      approval
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getApprovals, processApprovalAction, recordFinanceOpinion };
