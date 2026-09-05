const express = require('express');
const router = express.Router();
const { 
  getNegotiationByQuotation, 
  addNegotiationMessage,
  getCustomerNegotiations,
  reopenNegotiation
} = require('../controllers/negotiationController');
const { protect } = require('../middleware/auth');

router.get('/quotation/:quotationId', protect, getNegotiationByQuotation);
router.post('/quotation/:quotationId/message', protect, addNegotiationMessage);
router.get('/customer-corner', protect, getCustomerNegotiations);
router.post('/reopen', protect, reopenNegotiation);

module.exports = router;
