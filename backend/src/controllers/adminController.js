const Product = require('../models/Product');
const DiscountTier = require('../models/DiscountTier');
const CategoryLimit = require('../models/CategoryLimit');
const PriceList = require('../models/PriceList');
const Warehouse = require('../models/Warehouse');
const User = require('../models/User');
const Customer = require('../models/Customer');
const CustomerRequest = require('../models/CustomerRequest');
const Quotation = require('../models/Quotation');
const Negotiation = require('../models/Negotiation');
const Approval = require('../models/Approval');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Invoice = require('../models/Invoice');
const Fulfillment = require('../models/Fulfillment');
const Backorder = require('../models/Backorder');

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
    const { name, sku, category, unitPrice, cost, description, type, billingFrequency } = req.body;
    const product = new Product({
      name,
      sku,
      category,
      unitPrice,
      cost,
      description: description || '',
      type: type || (category === 'Services' ? 'RECURRING' : 'ONE_TIME'),
      billingFrequency: billingFrequency || (category === 'Services' ? 'MONTHLY' : 'NONE')
    });
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

const createPriceList = async (req, res) => {
  try {
    const { name, product, customerTier, salesPrice, effectiveDate } = req.body;
    if (!product || !customerTier || salesPrice === undefined) {
      return res.status(400).json({ message: 'Product ID, customer tier, and sales price are required.' });
    }

    let priceList = await PriceList.findOne({ product, customerTier });
    if (priceList) {
      priceList.salesPrice = Number(salesPrice);
      if (name) priceList.name = name;
      if (effectiveDate) priceList.effectiveDate = effectiveDate;
      await priceList.save();
    } else {
      priceList = new PriceList({
        name: name || `${customerTier} Tier Price List`,
        product,
        customerTier,
        salesPrice: Number(salesPrice),
        effectiveDate: effectiveDate || new Date()
      });
      await priceList.save();
    }

    const populated = await PriceList.findById(priceList._id).populate('product');
    res.status(201).json(populated);
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

// --- SUBSCRIPTION PLANS ---
const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSubscriptionPlan = async (req, res) => {
  try {
    const { name, description, price, billingFrequency, durationMonths, status } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Plan name and price are required' });
    }

    const plan = new SubscriptionPlan({
      name,
      description: description || '',
      price: Number(price),
      billingFrequency: billingFrequency || 'Monthly',
      durationMonths: Number(durationMonths) || 12,
      status: status || 'Active'
    });

    await plan.save();
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- USERS MANAGEMENT ---
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('salesManagerId').populate('customerId');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role, salesManagerId, company } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: 'A user account with this email already exists.' });
    }

    let customerId = null;
    if (role === 'CUSTOMER') {
      const defaultRep = await User.findOne({ role: 'SALES_REP' });
      const defaultManager = await User.findOne({ role: 'SALES_MANAGER' });
      const customerDoc = await Customer.create({
        name: company || name,
        email: cleanEmail,
        password,
        company: (company || name).trim(),
        tier: 'Bronze',
        creditLimit: 500000,
        assignedSalesRepresentative: defaultRep ? defaultRep._id : null,
        assignedSalesManager: defaultManager ? defaultManager._id : null,
        assignmentStatus: defaultRep ? 'REP_ASSIGNED' : 'UNASSIGNED',
        assignedAt: new Date()
      });
      customerId = customerDoc._id;
    }

    const user = new User({
      name,
      email: cleanEmail,
      password,
      role,
      salesManagerId: role === 'SALES_REP' ? (salesManagerId || null) : null,
      customerId
    });

    await user.save();

    const populated = await User.findById(user._id).select('-password').populate('salesManagerId').populate('customerId');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { role, salesManagerId, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (role) user.role = role;
    if (salesManagerId !== undefined) user.salesManagerId = salesManagerId || null;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    const updated = await User.findById(user._id).select('-password').populate('salesManagerId').populate('customerId');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- CUSTOMERS ---
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
      .populate('assignedSalesRepresentative', 'name email phone')
      .populate('assignedSalesManager', 'name email');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCustomerRepAssignment = async (req, res) => {
  try {
    const { assignedSalesRepresentative } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (assignedSalesRepresentative) {
      const repUser = await User.findById(assignedSalesRepresentative);
      if (!repUser || repUser.role !== 'SALES_REP') {
        return res.status(400).json({ message: 'Invalid Sales Representative selected' });
      }

      customer.assignedSalesRepresentative = repUser._id;
      customer.assignedSalesManager = repUser.salesManagerId || null;
      customer.assignmentStatus = 'REP_ASSIGNED';
      customer.assignedAt = new Date();
    } else {
      customer.assignedSalesRepresentative = null;
      customer.assignmentStatus = 'UNASSIGNED';
    }

    await customer.save();
    const updated = await Customer.findById(customer._id)
      .populate('assignedSalesRepresentative', 'name email phone')
      .populate('assignedSalesManager', 'name email');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- PLATFORM-WIDE ANALYTICS & PERFORMANCE REPORTING ---
const getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalProducts,
      totalRequests,
      totalQuotations,
      totalClosedDeals,
      pendingApprovals,
      activeNegotiations,
      rejectedDeals,
      withdrawnDeals,
      stoppedDeals,
      activeSubscriptions,
      unpaidInvoices,
      fulfillmentCount,
      backorderCount,
      allQuotationDocs
    ] = await Promise.all([
      User.countDocuments(),
      Customer.countDocuments(),
      Product.countDocuments({ isArchived: false }),
      CustomerRequest.countDocuments({ status: { $ne: 'DISCARDED' } }),
      Quotation.countDocuments({ status: { $ne: 'DISCARDED' } }),
      Quotation.countDocuments({ status: { $in: ['Accepted', 'Closed', 'CLOSED'] } }),
      Approval.countDocuments({ 'managerApproval.status': 'PENDING' }),
      Negotiation.countDocuments({ status: { $in: ['Open', 'Active', 'Under Review', 'PENDING_MANAGER_APPROVAL', 'NEGOTIATION'] } }),
      CustomerRequest.countDocuments({ status: { $in: ['Rejected_Rep', 'Rejected_Manager', 'REJECTED', 'Rejected'] } }),
      CustomerRequest.countDocuments({ status: { $in: ['WITHDRAWN', 'WITHDRAWN_CUSTOMER'] } }),
      CustomerRequest.countDocuments({ status: { $in: ['CANCELLED', 'STOPPED'] } }),
      Subscription.countDocuments({ status: { $in: ['Active', 'ACTIVE', 'Trialing'] } }),
      Invoice.countDocuments({ paymentStatus: { $ne: 'Paid' } }),
      Fulfillment.countDocuments({ status: 'Delivered' }),
      Backorder.countDocuments({ status: 'PENDING' }),
      Quotation.find({ status: { $ne: 'DISCARDED' } }).populate('salesRep', 'name email').populate('assignedSalesManager', 'name email')
    ]);

    let totalPlatformRevenue = 0;
    allQuotationDocs.forEach(q => {
      if (q.status === 'Accepted' || q.status === 'Closed' || q.status === 'CLOSED') {
        totalPlatformRevenue += (q.grandTotal || 0);
      }
    });

    // Sales Representatives Performance Breakdown
    const salesReps = await User.find({ role: 'SALES_REP' }).populate('salesManagerId', 'name email');
    const repPerformance = await Promise.all(
      salesReps.map(async (rep) => {
        const [reqCount, handledCount, negCount, quoteCount, wonQuotes, rejCount] = await Promise.all([
          CustomerRequest.countDocuments({ assignedSalesRep: rep._id }),
          CustomerRequest.countDocuments({ assignedSalesRep: rep._id, status: { $ne: 'Pending' } }),
          Negotiation.countDocuments({ salesRep: rep._id, status: { $in: ['Open', 'Active', 'NEGOTIATION'] } }),
          Quotation.countDocuments({ salesRep: rep._id }),
          Quotation.find({ salesRep: rep._id, status: { $in: ['Accepted', 'Closed', 'CLOSED'] } }),
          CustomerRequest.countDocuments({ assignedSalesRep: rep._id, status: { $in: ['Rejected_Rep', 'Rejected_Manager', 'REJECTED', 'Rejected'] } })
        ]);

        const wonCount = wonQuotes.length;
        const totalRev = wonQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
        const avgDealVal = wonCount > 0 ? Number((totalRev / wonCount).toFixed(2)) : 0;
        const conversionRate = reqCount > 0 ? Number(((wonCount / reqCount) * 100).toFixed(1)) : 0;

        return {
          _id: rep._id,
          name: rep.name,
          email: rep.email,
          managerName: rep.salesManagerId?.name || 'Unassigned',
          totalRequests: reqCount,
          requestsHandled: handledCount,
          activeNegotiations: negCount,
          quotationsCreated: quoteCount,
          dealsWon: wonCount,
          dealsRejected: rejCount,
          totalRevenue: totalRev,
          averageDealValue: avgDealVal,
          conversionRate
        };
      })
    );

    // Sales Managers Performance Breakdown
    const salesManagers = await User.find({ role: 'SALES_MANAGER' });
    const managerPerformance = await Promise.all(
      salesManagers.map(async (mgr) => {
        const teamReps = await User.find({ salesManagerId: mgr._id }).select('_id');
        const teamRepIds = teamReps.map(r => r._id);

        const [escalations, approvals, rejections, negRequested, teamWonQuotes] = await Promise.all([
          Approval.countDocuments({ salesManager: mgr._id }),
          Approval.countDocuments({ salesManager: mgr._id, 'managerApproval.status': 'APPROVED' }),
          Approval.countDocuments({ salesManager: mgr._id, 'managerApproval.status': 'REJECTED' }),
          Approval.countDocuments({ salesManager: mgr._id, 'managerApproval.status': 'NEGOTIATION_REQUIRED' }),
          Quotation.find({ salesRep: { $in: teamRepIds }, status: { $in: ['Accepted', 'Closed', 'CLOSED'] } })
        ]);

        const teamRev = teamWonQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
        const approvalRate = escalations > 0 ? Number(((approvals / escalations) * 100).toFixed(1)) : 0;

        return {
          _id: mgr._id,
          name: mgr.name,
          email: mgr.email,
          teamSize: teamReps.length,
          escalationsReceived: escalations,
          approvalsGranted: approvals,
          rejections: rejections,
          negotiationsRequested: negRequested,
          approvalRate,
          dealsClosed: teamWonQuotes.length,
          teamRevenue: teamRev
        };
      })
    );

    res.json({
      kpis: {
        totalUsers,
        totalCustomers,
        totalProducts,
        totalRequests,
        totalQuotations,
        totalClosedDeals,
        totalPlatformRevenue,
        pendingApprovals,
        activeNegotiations,
        rejectedDeals,
        withdrawnDeals,
        stoppedDeals,
        activeSubscriptions,
        unpaidInvoices,
        fulfillmentCount,
        backorderCount
      },
      repPerformance,
      managerPerformance
    });
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
};
