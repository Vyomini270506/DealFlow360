const Product = require('../models/Product');
const DiscountTier = require('../models/DiscountTier');
const CategoryLimit = require('../models/CategoryLimit');
const PriceList = require('../models/PriceList');
const Warehouse = require('../models/Warehouse');
const User = require('../models/User');
const Customer = require('../models/Customer');

// --- DISCOUNT TIERS & CATEGORY LIMITS ---
const getConfig = async (req, res) => {
  try {
    const discountTiers = await DiscountTier.find();
    const categoryLimits = await CategoryLimit.find();
    res.json({ discountTiers, categoryLimits });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateDiscountTier = async (req, res) => {
  try {
    const { tier, maxDiscountPercentage } = req.body;
    let tierDoc = await DiscountTier.findOne({ tier });
    if (!tierDoc) {
      tierDoc = new DiscountTier({ tier, maxDiscountPercentage });
    } else {
      tierDoc.maxDiscountPercentage = maxDiscountPercentage;
    }
    await tierDoc.save();
    res.json(tierDoc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCategoryLimit = async (req, res) => {
  try {
    const { category, maxDiscountPercentage } = req.body;
    let catDoc = await CategoryLimit.findOne({ category });
    if (!catDoc) {
      catDoc = new CategoryLimit({ category, maxDiscountPercentage });
    } else {
      catDoc.maxDiscountPercentage = maxDiscountPercentage;
    }
    await catDoc.save();
    res.json(catDoc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- PRODUCTS ---
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ isArchived: false });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- PRICE LISTS ---
const getPriceLists = async (req, res) => {
  try {
    const priceLists = await PriceList.find().populate('product');
    res.json(priceLists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- WAREHOUSES ---
const getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find();
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createWarehouse = async (req, res) => {
  try {
    const warehouse = new Warehouse(req.body);
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- USERS ---
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('salesManagerId').populate('customerId');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- CUSTOMERS ---
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
