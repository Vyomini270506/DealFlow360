const express = require('express');
const router = express.Router();
const { getQuotations, getQuotationById, createQuotation, submitQuotation } = require('../controllers/quotationController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getQuotations)
  .post(protect, createQuotation);

router.get('/:id', protect, getQuotationById);
router.post('/:id/submit', protect, submitQuotation);

module.exports = router;
