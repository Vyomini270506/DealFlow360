const Quotation = require('../models/Quotation');
const Customer = require('../models/Customer');
const User = require('../models/User');

// @desc Get all unassigned customer requests (Admin view)
// @route GET /api/admin/unassigned-requests
const getUnassignedRequests = async (req, res) => {
  try {
    const unassignedQuotes = await Quotation.find({
      $or: [
        { assignmentStatus: 'UNASSIGNED' },
        { salesRep: null }
      ]
    })
      .populate('customer')
      .populate('items.product');

    const salesManagers = await User.find({ role: 'SALES_MANAGER' }).select('-password');

    res.json({
      unassignedQuotes,
      salesManagers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Admin assigns Sales Manager to Customer request
// @route POST /api/admin/assign-manager
const assignManager = async (req, res) => {
  try {
    const { quotationId, customerId, salesManagerId } = req.body;

    const manager = await User.findById(salesManagerId);
    if (!manager || manager.role !== 'SALES_MANAGER') {
      return res.status(400).json({ message: 'Invalid Sales Manager selected' });
    }

    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        assignedSalesManager: salesManagerId,
        assignmentStatus: 'MANAGER_ASSIGNED'
      });
    }

    if (quotationId) {
      await Quotation.findByIdAndUpdate(quotationId, {
        assignedSalesManager: salesManagerId,
        assignmentStatus: 'MANAGER_ASSIGNED'
      });
    }

    res.json({ message: `Successfully assigned request to Sales Manager ${manager.name}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get requests assigned to Sales Manager awaiting Rep assignment
// @route GET /api/sales-manager/assigned-requests
const getManagerAssignedRequests = async (req, res) => {
  try {
    const managerQuotes = await Quotation.find({
      assignedSalesManager: req.user._id,
      assignmentStatus: 'MANAGER_ASSIGNED'
    })
      .populate('customer')
      .populate('items.product');

    // Fetch reps reporting to this manager (or all reps if not explicitly assigned)
    let teamReps = await User.find({ role: 'SALES_REP', salesManagerId: req.user._id }).select('-password');
    if (teamReps.length === 0) {
      teamReps = await User.find({ role: 'SALES_REP' }).select('-password');
    }

    res.json({
      managerQuotes,
      teamReps
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Sales Manager assigns Sales Rep to Customer request
// @route POST /api/sales-manager/assign-rep
const assignRep = async (req, res) => {
  try {
    const { quotationId, customerId, salesRepId } = req.body;

    const rep = await User.findById(salesRepId);
    if (!rep || rep.role !== 'SALES_REP') {
      return res.status(400).json({ message: 'Invalid Sales Representative selected' });
    }

    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, {
        assignedSalesRepresentative: salesRepId,
        assignmentStatus: 'REP_ASSIGNED',
        assignedAt: new Date()
      });
    }

    if (quotationId) {
      await Quotation.findByIdAndUpdate(quotationId, {
        salesRep: salesRepId,
        assignmentStatus: 'REP_ASSIGNED'
      });
    }

    res.json({ message: `Successfully assigned Sales Rep ${rep.name} as final point of contact` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get assigned Sales Representative details for Customer
// @route GET /api/customer/my-sales-rep
const getCustomerAssignedRep = async (req, res) => {
  try {
    if (!req.user.customerId) {
      return res.status(404).json({ message: 'No customer account associated with user' });
    }

    const customer = await Customer.findById(req.user.customerId)
      .populate('assignedSalesManager', 'name email role avatar')
      .populate('assignedSalesRepresentative', 'name email role avatar phone');

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUnassignedRequests,
  assignManager,
  getManagerAssignedRequests,
  assignRep,
  getCustomerAssignedRep
};
