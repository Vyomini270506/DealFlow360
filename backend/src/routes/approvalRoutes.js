const express = require('express');
const router = express.Router();
const { getApprovals, processApprovalAction, recordFinanceOpinion } = require('../controllers/approvalController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getApprovals);
router.post('/:id/action', protect, processApprovalAction);
router.post('/:id/finance-opinion', protect, recordFinanceOpinion);

module.exports = router;
