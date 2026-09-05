const express = require('express');
const router = express.Router();
const {
  getConfig,
  updateDiscountTier,
  updateCategoryLimit,
  getProducts,
  createProduct,
  getPriceLists,
  getWarehouses,
  createWarehouse,
  getUsers,
  getCustomers
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.get('/config', protect, getConfig);
router.put('/discount-tier', protect, authorizeRoles('ADMIN'), updateDiscountTier);
router.put('/category-limit', protect, authorizeRoles('ADMIN'), updateCategoryLimit);

router.route('/products')
  .get(protect, getProducts)
  .post(protect, authorizeRoles('ADMIN'), createProduct);

router.get('/pricelists', protect, getPriceLists);

router.route('/warehouses')
  .get(protect, getWarehouses)
  .post(protect, authorizeRoles('ADMIN'), createWarehouse);

router.get('/users', protect, authorizeRoles('ADMIN'), getUsers);
router.get('/customers', protect, getCustomers);

module.exports = router;
