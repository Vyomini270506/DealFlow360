const express = require('express');
const router = express.Router();
const { 
  getNegotiationByQuotation, 
  getNegotiationByCustomerRequest,
  addNegotiationMessage,
  getNegotiationById,
  addNegotiationMessageById,
  getCustomerNegotiations,
  getSalesRepNegotiations,
  reopenNegotiation,
  acceptNegotiation,
  escalateNegotiationToManager,
  withdrawNegotiation,
  addManagerAdvice
} = require('../controllers/negotiationController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.get('/sales-rep', protect, authorizeRoles('SALES_REP'), getSalesRepNegotiations);
router.get('/customer-corner', protect, getCustomerNegotiations);
router.get('/quotation/:quotationId', protect, getNegotiationByQuotation);
router.get('/customer-request/:requestId', protect, getNegotiationByCustomerRequest);
router.post('/quotation/:quotationId/message', protect, addNegotiationMessage);
router.post('/quotation/:quotationId/accept', protect, acceptNegotiation);
router.post('/quotation/:quotationId/escalate-manager', protect, escalateNegotiationToManager);
router.post('/quotation/:quotationId/manager-advice', protect, authorizeRoles('SALES_MANAGER', 'ADMIN'), addManagerAdvice);
router.post('/:id/manager-advice', protect, authorizeRoles('SALES_MANAGER', 'ADMIN'), addManagerAdvice);
router.get('/:id', protect, getNegotiationById);
router.post('/:id/message', protect, addNegotiationMessageById);
router.post('/:id/withdraw', protect, withdrawNegotiation);
router.post('/reopen', protect, reopenNegotiation);

module.exports = router;

