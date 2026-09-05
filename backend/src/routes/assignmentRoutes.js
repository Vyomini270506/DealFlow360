const express = require('express');
const router = express.Router();
const {
  getUnassignedRequests,
  assignManager,
  getManagerAssignedRequests,
  assignRep,
  getCustomerAssignedRep
} = require('../controllers/assignmentController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.get('/unassigned', protect, authorizeRoles('ADMIN'), getUnassignedRequests);
router.post('/assign-manager', protect, authorizeRoles('ADMIN'), assignManager);

router.get('/manager-assigned', protect, authorizeRoles('SALES_MANAGER', 'ADMIN'), getManagerAssignedRequests);
router.post('/assign-rep', protect, authorizeRoles('SALES_MANAGER', 'ADMIN'), assignRep);

router.get('/my-rep', protect, authorizeRoles('CUSTOMER'), getCustomerAssignedRep);

module.exports = router;
