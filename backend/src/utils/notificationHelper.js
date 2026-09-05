const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Send notification to a single recipient
 */
const sendNotification = async ({ recipient, title, message, type = 'SYSTEM', link = '' }) => {
  try {
    if (!recipient) return;
    const notif = new Notification({
      recipient,
      title,
      message,
      type,
      link,
      isRead: false
    });
    await notif.save();
    return notif;
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
};

/**
 * Notify sales managers about a Sales Rep action
 */
const notifyManagersForRepAction = async ({ repId, title, message, type = 'APPROVAL_REQ', link = '' }) => {
  try {
    const rep = await User.findById(repId);
    let managerIds = [];
    if (rep && rep.salesManagerId) {
      managerIds.push(rep.salesManagerId);
    } else {
      const managers = await User.find({ role: 'SALES_MANAGER' }).select('_id');
      managerIds = managers.map(m => m._id);
    }
    for (const mId of managerIds) {
      await sendNotification({
        recipient: mId,
        title,
        message,
        type,
        link
      });
    }
  } catch (err) {
    console.error('Manager notification error:', err.message);
  }
};

/**
 * Helper to find customer User account by Customer ObjectId
 */
const getCustomerUserId = async (customerId) => {
  if (!customerId) return null;
  const targetId = customerId._id || customerId;
  const custUser = await User.findOne({ customerId: targetId });
  return custUser ? custUser._id : null;
};

/**
 * Notify both Customer and Sales Representative when Sales Manager makes a decision/override
 */
const notifyCustomerAndRepOnManagerAction = async ({ customerId, repId, title, message, type = 'APPROVAL_DECISION', link = '' }) => {
  try {
    // 1. Notify Customer User
    const customerUserId = await getCustomerUserId(customerId);
    if (customerUserId) {
      await sendNotification({
        recipient: customerUserId,
        title,
        message,
        type,
        link
      });
    }

    // 2. Notify Sales Representative User
    if (repId) {
      await sendNotification({
        recipient: repId,
        title,
        message: `Manager Action Update: ${message}`,
        type,
        link
      });
    }
  } catch (err) {
    console.error('Customer & Rep notification error:', err.message);
  }
};

module.exports = {
  sendNotification,
  notifyManagersForRepAction,
  getCustomerUserId,
  notifyCustomerAndRepOnManagerAction
};
