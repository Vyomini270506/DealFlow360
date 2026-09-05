const express = require('express');
const router = express.Router();
const { getFulfillments, getFulfillmentById, overrideAllocation, getBackorders } = require('../controllers/fulfillmentController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.get('/backorders', protect, getBackorders);
router.get('/', protect, getFulfillments);
router.get('/:id', protect, getFulfillmentById);
router.put('/:id/override', protect, authorizeRoles('FINANCE_OPERATIONS', 'ADMIN'), overrideAllocation);

module.exports = router;
