const express = require('express');
const router = express.Router();
const { getAuditLogsForRecord, getAllAuditLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllAuditLogs);
router.get('/:recordType/:recordId', protect, getAuditLogsForRecord);

module.exports = router;
