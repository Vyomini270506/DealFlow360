const express = require('express');
const router = express.Router();
const { 
  getQuotations, 
  getQuotationById, 
  createQuotation, 
  submitQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation 
} = require('../controllers/quotationController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getQuotations)
  .post(protect, createQuotation);

router.get('/:id', protect, getQuotationById);
router.post('/:id/submit', protect, submitQuotation);
router.post('/:id/send', protect, sendQuotation);
router.post('/:id/accept', protect, acceptQuotation);
router.post('/:id/reject', protect, rejectQuotation);

module.exports = router;
