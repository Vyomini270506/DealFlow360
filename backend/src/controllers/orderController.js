const Order = require('../models/Order');
const Customer = require('../models/Customer');
const User = require('../models/User');

// @desc Get all orders with strict RBAC scoping
// @route GET /api/orders
const getOrders = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'CUSTOMER') {
      if (!req.user.customerId) return res.json([]);
      const customerId = req.user.customerId._id || req.user.customerId;
      filter.customer = customerId;
    } else if (req.user.role === 'SALES_REP') {
      const myCustomers = await Customer.find({ assignedSalesRepresentative: req.user._id }).select('_id');
      const custIds = myCustomers.map(c => c._id);
      filter.$or = [
        { salesRep: req.user._id },
        { customer: { $in: custIds } }
      ];
    } else if (req.user.role === 'SALES_MANAGER') {
      const teamReps = await User.find({ salesManagerId: req.user._id }).select('_id');
      const repIds = teamReps.map(r => r._id);
      filter.$or = [
        { salesRep: { $in: repIds } }
      ];
    }

    const orders = await Order.find(filter)
      .populate('customer', 'name company email tier')
      .populate('salesRep', 'name email role')
      .populate('quotation', 'quoteNumber status grandTotal')
      .populate('invoice', 'invoiceNumber paymentStatus')
      .populate('fulfillment', 'status')
      .populate('items.product', 'name sku category unitPrice')
      .sort('-createdAt');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single order details
// @route GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer')
      .populate('salesRep', 'name email role')
      .populate('quotation')
      .populate('invoice')
      .populate('fulfillment')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role === 'CUSTOMER') {
      const userCustId = req.user.customerId?._id ? req.user.customerId._id.toString() : req.user.customerId?.toString();
      if (!userCustId || order.customer._id.toString() !== userCustId) {
        return res.status(403).json({ message: 'Not authorized to view this order' });
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getOrders, getOrderById };
