const Message = require('../models/Message');
const Customer = require('../models/Customer');
const User = require('../models/User');

// @desc Get chat messages between customer and their assigned Sales Representative
// @route GET /api/messages
const getMessages = async (req, res) => {
  try {
    let customerId = req.user.customerId;
    if (req.user.role === 'CUSTOMER' && customerId) {
      if (customerId._id) customerId = customerId._id;
    }

    if (!customerId) {
      return res.status(400).json({ message: 'No customer account linked to authenticated user' });
    }

    const customer = await Customer.findById(customerId).populate('assignedSalesRepresentative', 'name email role');
    if (!customer || !customer.assignedSalesRepresentative) {
      return res.json({ assignedRep: null, messages: [] });
    }

    const repId = customer.assignedSalesRepresentative._id;

    // Fetch messages between logged-in user and assigned sales rep
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: repId },
        { sender: repId, recipient: req.user._id },
        { customer: customer._id }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name role avatar')
    .populate('recipient', 'name role avatar');

    res.json({
      assignedRep: customer.assignedSalesRepresentative,
      messages
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Send message to assigned Sales Representative ONLY
// @route POST /api/messages
const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    let customerId = req.user.customerId;
    if (req.user.role === 'CUSTOMER' && customerId) {
      if (customerId._id) customerId = customerId._id;
    }

    if (!customerId) {
      return res.status(400).json({ message: 'No customer account linked to authenticated user' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer || !customer.assignedSalesRepresentative) {
      return res.status(400).json({ message: 'No Sales Representative assigned to your customer account yet' });
    }

    const repId = customer.assignedSalesRepresentative;

    const newMessage = new Message({
      sender: req.user._id,
      recipient: repId,
      customer: customer._id,
      content: content.trim()
    });

    await newMessage.save();
    const populated = await Message.findById(newMessage._id).populate('sender', 'name role avatar');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages,
  sendMessage
};
