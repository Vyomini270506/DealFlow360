const express = require('express');
const router = express.Router();
const { 
  getNegotiationByQuotation, 
  addNegotiationMessage,
  getCustomerNegotiations,
  getSalesRepNegotiations,
  reopenNegotiation,
  acceptNegotiation,
  escalateNegotiationToManager
} = require('../controllers/negotiationController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.get('/sales-rep', protect, authorizeRoles('SALES_REP'), getSalesRepNegotiations);
router.get('/quotation/:quotationId', protect, getNegotiationByQuotation);
router.post('/quotation/:quotationId/message', protect, addNegotiationMessage);
router.post('/quotation/:quotationId/accept', protect, acceptNegotiation);
router.post('/quotation/:quotationId/escalate-manager', protect, escalateNegotiationToManager);
router.get('/customer-corner', protect, getCustomerNegotiations);
router.post('/reopen', protect, reopenNegotiation);

module.exports = router;
