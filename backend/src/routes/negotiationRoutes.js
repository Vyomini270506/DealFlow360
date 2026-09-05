const express = require('express');
const router = express.Router();
const { getNegotiationByQuotation, addNegotiationMessage } = require('../controllers/negotiationController');
const { protect } = require('../middleware/auth');

router.get('/quotation/:quotationId', protect, getNegotiationByQuotation);
router.post('/quotation/:quotationId/message', protect, addNegotiationMessage);

module.exports = router;
