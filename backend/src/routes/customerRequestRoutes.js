const express = require('express');
const router = express.Router();
const {
  createCustomerRequest,
  getCustomerRequests,
  getCustomerRequestById,
  repActionOnRequest,
  escalateToManager,
  sendToFinance,
  financeAction,
  managerAction,
  startNegotiationFromRequest,
  createQuotationFromRequest,
  discardCustomerRequest
} = require('../controllers/customerRequestController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.route('/')
  .post(protect, authorizeRoles('CUSTOMER'), createCustomerRequest)
  .get(protect, getCustomerRequests);

router.get('/:id', protect, getCustomerRequestById);
router.post('/:id/rep-action', protect, authorizeRoles('SALES_REP'), repActionOnRequest);
router.post('/:id/escalate', protect, authorizeRoles('SALES_REP'), escalateToManager);
router.post('/:id/send-to-finance', protect, authorizeRoles('SALES_MANAGER', 'ADMIN'), sendToFinance);
router.post('/:id/finance-action', protect, authorizeRoles('FINANCE_OPERATIONS', 'ADMIN'), financeAction);
router.post('/:id/manager-action', protect, authorizeRoles('SALES_MANAGER', 'ADMIN'), managerAction);
router.post('/:id/start-negotiation', protect, authorizeRoles('SALES_REP', 'ADMIN'), startNegotiationFromRequest);
router.post('/:id/create-quotation', protect, authorizeRoles('SALES_REP'), createQuotationFromRequest);
router.post('/:id/discard', protect, discardCustomerRequest);

module.exports = router;

