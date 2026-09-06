const express = require('express');
const router = express.Router();
const { 
  getSubscriptions, 
  createSubscription, 
  updateSubscriptionStatus,
  generateNextBillingInvoice,
  cancelSubscription 
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getSubscriptions)
  .post(protect, createSubscription);

router.put('/:id/status', protect, updateSubscriptionStatus);
router.post('/:id/generate-invoice', protect, generateNextBillingInvoice);
router.post('/:id/cancel', protect, cancelSubscription);

module.exports = router;
