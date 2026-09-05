const express = require('express');
const router = express.Router();
const { getApprovals, processApprovalAction } = require('../controllers/approvalController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getApprovals);
router.post('/:id/action', protect, processApprovalAction);

module.exports = router;
