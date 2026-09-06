const express = require('express');
const router = express.Router();
const { getOrders, getOrderById } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);

module.exports = router;
