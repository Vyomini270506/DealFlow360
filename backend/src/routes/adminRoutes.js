const express = require('express');
const router = express.Router();
const {
  getConfig,
  updateDiscountTier,
  updateCategoryLimit,
  getProducts,
  createProduct,
  getPriceLists,
  createPriceList,
  getWarehouses,
  createWarehouse,
  getSubscriptionPlans,
  createSubscriptionPlan,
  getUsers,
  createUser,
  updateUser,
  getCustomers,
  updateCustomerRepAssignment,
  getAnalytics
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.get('/config', protect, getConfig);
router.put('/discount-tier', protect, authorizeRoles('ADMIN'), updateDiscountTier);
router.put('/category-limit', protect, authorizeRoles('ADMIN'), updateCategoryLimit);

router.route('/products')
  .get(protect, getProducts)
  .post(protect, authorizeRoles('ADMIN'), createProduct);

router.route('/pricelists')
  .get(protect, getPriceLists)
  .post(protect, authorizeRoles('ADMIN'), createPriceList);

router.route('/warehouses')
  .get(protect, getWarehouses)
  .post(protect, authorizeRoles('ADMIN'), createWarehouse);

router.route('/subscription-plans')
  .get(protect, getSubscriptionPlans)
  .post(protect, authorizeRoles('ADMIN'), createSubscriptionPlan);

router.route('/users')
  .get(protect, authorizeRoles('ADMIN'), getUsers)
  .post(protect, authorizeRoles('ADMIN'), createUser);

router.put('/users/:id', protect, authorizeRoles('ADMIN'), updateUser);
router.get('/customers', protect, getCustomers);
router.put('/customers/:id/assign-rep', protect, authorizeRoles('ADMIN'), updateCustomerRepAssignment);
router.get('/analytics', protect, authorizeRoles('ADMIN'), getAnalytics);

module.exports = router;
