const express = require('express');
const router = express.Router();
const { getSubscriptions, createSubscription, updateSubscriptionStatus } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getSubscriptions)
  .post(protect, createSubscription);

router.put('/:id/status', protect, updateSubscriptionStatus);

module.exports = router;
