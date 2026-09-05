const express = require('express');
const router = express.Router();
const { getInvoices, getInvoiceById, generateInvoice, recordPayment } = require('../controllers/invoiceController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.get('/', protect, getInvoices);
router.get('/:id', protect, getInvoiceById);
router.post('/generate/:fulfillmentId', protect, authorizeRoles('FINANCE_OPERATIONS', 'ADMIN'), generateInvoice);
router.post('/:id/payment', protect, recordPayment);

module.exports = router;
