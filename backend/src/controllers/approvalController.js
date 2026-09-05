const Approval = require('../models/Approval');
const Quotation = require('../models/Quotation');
const User = require('../models/User');
const { allocateFulfillmentStock } = require('../services/fulfillmentService');

// @desc Get pending approvals based on active user role
// @route GET /api/approvals
const getApprovals = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'SALES_MANAGER') {
      // Find reps belonging to this manager
      const teamReps = await User.find({ salesManagerId: req.user._id }).select('_id');
      const repIds = teamReps.map(r => r._id);
      
      filter = {
        currentStep: 'SALES_MANAGER',
        'managerApproval.status': 'PENDING',
        salesRep: { $in: [...repIds, req.user._id] }
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
      .populate('salesRep', 'name email')
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

    const quotation = await Quotation.findById(approval.quotation);
    if (!quotation) {
      return res.status(404).json({ message: 'Associated quotation not found' });
    }

    // Role Validation
    if (approval.currentStep === 'SALES_MANAGER') {
      if (req.user.role !== 'SALES_MANAGER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only Sales Managers can perform this approval step' });
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

        // Check if High Risk requires Finance approval
        if (approval.riskLevel === 'HIGH') {
          approval.currentStep = 'FINANCE_OPERATIONS';
          approval.financeApproval.status = 'PENDING';
          quotation.approvalChainState = 'FINANCE_OPERATIONS';
          quotation.status = 'Pending Approval';
        } else {
          approval.currentStep = 'COMPLETED';
          quotation.approvalChainState = 'APPROVED';
          quotation.status = 'Approved';
        }
      } else if (action === 'REJECT') {
        approval.managerApproval.status = 'REJECTED';
        approval.currentStep = 'REJECTED';
        quotation.approvalChainState = 'REJECTED';
        quotation.status = 'Rejected';

        approval.auditTrail.push({
          user: req.user._id,
          action: 'REJECTED',
          role: req.user.role,
          reason
        });
      } else if (action === 'RETURN_FOR_CHANGES') {
        quotation.status = 'Draft';
        approval.managerApproval.status = 'PENDING';

        approval.auditTrail.push({
          user: req.user._id,
          action: 'RETURNED_FOR_CHANGES',
          role: req.user.role,
          reason
        });
      }
    } else if (approval.currentStep === 'FINANCE_OPERATIONS') {
      if (req.user.role !== 'FINANCE_OPERATIONS' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Only Finance/Operations can perform this high-risk approval step' });
      }

      if (action === 'APPROVE') {
        approval.financeApproval.status = 'APPROVED';
        approval.financeApproval.approvedBy = req.user._id;
        approval.financeApproval.comment = reason;
        approval.financeApproval.actionDate = new Date();
        approval.currentStep = 'COMPLETED';

        quotation.approvalChainState = 'APPROVED';
        quotation.status = 'Approved';

        approval.auditTrail.push({
          user: req.user._id,
          action: 'APPROVED_BY_FINANCE',
          role: req.user.role,
          reason
        });
      } else if (action === 'REJECT') {
        approval.financeApproval.status = 'REJECTED';
        approval.currentStep = 'REJECTED';
        quotation.approvalChainState = 'REJECTED';
        quotation.status = 'Rejected';

        approval.auditTrail.push({
          user: req.user._id,
          action: 'REJECTED',
          role: req.user.role,
          reason
        });
      }
    }

    await quotation.save();
    await approval.save();

    // If quotation became Approved, auto-initialize Fulfillment Allocation
    if (quotation.status === 'Approved') {
      await allocateFulfillmentStock(quotation);
    }

    res.json({ quotation, approval });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getApprovals, processApprovalAction };
