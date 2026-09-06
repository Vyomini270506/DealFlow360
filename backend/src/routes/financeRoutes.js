const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getFinanceOverviewMetrics,
  getInvoices,
  recordPayment,
  getPaymentsHistory,
  createCreditNote,
  getCreditNotes,
  generateSubscriptionInvoice,
  getReconciliationAlerts
} = require('../controllers/financeController');

// All finance routes require authentication
router.use(protect);

router.get('/overview', getFinanceOverviewMetrics);
router.get('/invoices', getInvoices);
router.post('/payments', recordPayment);
router.get('/payments', getPaymentsHistory);
router.post('/credit-notes', createCreditNote);
router.get('/credit-notes', getCreditNotes);
router.post('/subscriptions/:id/generate-invoice', generateSubscriptionInvoice);
router.get('/reconciliation-alerts', getReconciliationAlerts);

module.exports = router;
