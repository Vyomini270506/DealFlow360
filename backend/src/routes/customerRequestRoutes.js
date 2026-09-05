const express = require('express');
const router = express.Router();
const {
  createCustomerRequest,
  getCustomerRequests,
  escalateToManager,
  managerAction,
  createQuotationFromRequest
} = require('../controllers/customerRequestController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.route('/')
  .post(protect, authorizeRoles('CUSTOMER'), createCustomerRequest)
  .get(protect, getCustomerRequests);

router.post('/:id/escalate', protect, authorizeRoles('SALES_REP'), escalateToManager);
router.post('/:id/manager-action', protect, authorizeRoles('SALES_MANAGER', 'ADMIN'), managerAction);
router.post('/:id/create-quotation', protect, authorizeRoles('SALES_REP'), createQuotationFromRequest);

module.exports = router;
