const express = require('express');
const router = express.Router();
const { getReportingStats, getDealHealthMetrics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.get('/reporting', protect, getReportingStats);
router.get('/deal-health', protect, getDealHealthMetrics);

module.exports = router;
