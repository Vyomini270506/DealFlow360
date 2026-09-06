const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getRiskRadar,
  getHealthScore,
  getCounterOffer,
  getProfitProtection,
  simulateApproval,
  getNegotiationHeat,
  getCustomerMemory,
  getWarehousePromise,
  getRescueDeals
} = require('../controllers/dealIntelligenceController');

router.get('/risk-radar/:quotationId', protect, getRiskRadar);
router.get('/health-score/:quotationId', protect, getHealthScore);
router.post('/counter-offer/:quotationId', protect, getCounterOffer);
router.post('/profit-protection', protect, getProfitProtection);
router.post('/approval-simulator', protect, simulateApproval);
router.get('/negotiation-heat/:quotationId', protect, getNegotiationHeat);
router.get('/customer-memory/:customerId', protect, getCustomerMemory);
router.post('/warehouse-promise', protect, getWarehousePromise);
router.get('/deals-needing-attention', protect, getRescueDeals);

module.exports = router;
