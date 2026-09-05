const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

// Models
const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const DiscountTier = require('../models/DiscountTier');
const CategoryLimit = require('../models/CategoryLimit');
const PriceList = require('../models/PriceList');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Quotation = require('../models/Quotation');
const Approval = require('../models/Approval');
const Fulfillment = require('../models/Fulfillment');
const Backorder = require('../models/Backorder');
const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const Negotiation = require('../models/Negotiation');

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    console.log('Clearing existing database collections...');

    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      DiscountTier.deleteMany({}),
      CategoryLimit.deleteMany({}),
      PriceList.deleteMany({}),
      Warehouse.deleteMany({}),
      Inventory.deleteMany({}),
      Quotation.deleteMany({}),
      Approval.deleteMany({}),
      Fulfillment.deleteMany({}),
      Backorder.deleteMany({}),
      Invoice.deleteMany({}),
      Subscription.deleteMany({}),
      Negotiation.deleteMany({})
    ]);

    console.log('Seeding Discount Tiers & Category Limits...');
    const discountTiers = await DiscountTier.insertMany([
      { tier: 'Bronze', maxDiscountPercentage: 5 },
      { tier: 'Silver', maxDiscountPercentage: 10 },
      { tier: 'Gold', maxDiscountPercentage: 15 }
    ]);

    const categoryLimits = await CategoryLimit.insertMany([
      { category: 'Hardware', maxDiscountPercentage: 15 },
      { category: 'Services', maxDiscountPercentage: 10 },
      { category: 'Software', maxDiscountPercentage: 20 }
    ]);

    console.log('Seeding Customers...');
    const customers = await Customer.insertMany([
      { name: 'Rajesh Kumar', email: 'rajesh@acmecorp.com', company: 'Acme Corp', tier: 'Gold', phone: '+91 9876543210', address: 'Bandra Kurla Complex, Mumbai' },
      { name: 'Anita Roy', email: 'anita@technova.io', company: 'TechNova', tier: 'Silver', phone: '+91 9812345678', address: 'Koramangala, Bangalore' },
      { name: 'Vikram Singh', email: 'vikram@globalsys.com', company: 'Global Systems', tier: 'Bronze', phone: '+91 9988776655', address: 'Cyber City, Gurgaon' },
      { name: 'Pooja Mehta', email: 'pooja@urbanretail.in', company: 'Urban Retail', tier: 'Gold', phone: '+91 9711223344', address: 'Connaught Place, New Delhi' },
      { name: 'Sanjay Dutt', email: 'sanjay@novaind.com', company: 'Nova Industries', tier: 'Silver', phone: '+91 9654321876', address: 'HITEC City, Hyderabad' }
    ]);

    console.log('Seeding Users & Team Hierarchy...');
    // Create Admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@dealflow360.com',
      password: 'password123',
      role: 'ADMIN'
    });

    // Create Sales Manager
    const manager = await User.create({
      name: 'Vikram Malhotra',
      email: 'manager@dealflow360.com',
      password: 'password123',
      role: 'SALES_MANAGER',
      pipelineTarget: 5000000
    });

    // Create 4 Sales Reps reporting to Manager
    const repRahul = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul@dealflow360.com',
      password: 'password123',
      role: 'SALES_REP',
      salesManagerId: manager._id,
      pipelineTarget: 1500000
    });

    const repPriya = await User.create({
      name: 'Priya Patel',
      email: 'priya@dealflow360.com',
      password: 'password123',
      role: 'SALES_REP',
      salesManagerId: manager._id,
      pipelineTarget: 1200000
    });

    const repAman = await User.create({
      name: 'Aman Gupta',
      email: 'aman@dealflow360.com',
      password: 'password123',
      role: 'SALES_REP',
      salesManagerId: manager._id,
      pipelineTarget: 1000000
    });

    const repNeha = await User.create({
      name: 'Neha Verma',
      email: 'neha@dealflow360.com',
      password: 'password123',
      role: 'SALES_REP',
      salesManagerId: manager._id,
      pipelineTarget: 800000
    });

    // Create Finance / Operations Users
    const finance1 = await User.create({
      name: 'Karan Shah',
      email: 'finance@dealflow360.com',
      password: 'password123',
      role: 'FINANCE_OPERATIONS'
    });

    const finance2 = await User.create({
      name: 'Deepa Iyer',
      email: 'deepa.ops@dealflow360.com',
      password: 'password123',
      role: 'FINANCE_OPERATIONS'
    });

    // Create Customer Portal Users
    const customerUser1 = await User.create({
      name: 'Rajesh Kumar (Acme)',
      email: 'customer@acmecorp.com',
      password: 'password123',
      role: 'CUSTOMER',
      customerId: customers[0]._id
    });

    const customerUser2 = await User.create({
      name: 'Anita Roy (TechNova)',
      email: 'customer@technova.io',
      password: 'password123',
      role: 'CUSTOMER',
      customerId: customers[1]._id
    });

    console.log('Seeding Products...');
    const products = await Product.insertMany([
      { name: 'Business Laptop Pro 15', sku: 'HW-LAP-01', category: 'Hardware', unitPrice: 85000, cost: 62000, description: 'High performance Intel i7, 32GB RAM, 1TB SSD' },
      { name: 'Enterprise Rack Server X4', sku: 'HW-SRV-04', category: 'Hardware', unitPrice: 350000, cost: 260000, description: 'Dual Xeon Silver, 128GB RAM, 4TB NVMe Raid' },
      { name: '4K UltraWide Monitor 34"', sku: 'HW-MON-34', category: 'Hardware', unitPrice: 45000, cost: 31000, description: '34-inch Curved IPS, USB-C Docking Hub' },
      { name: 'DealFlow Enterprise License', sku: 'SW-LIC-ENT', category: 'Software', unitPrice: 120000, cost: 20000, description: 'Annual per-user enterprise SaaS subscription' },
      { name: 'On-Site Server Installation Service', sku: 'SV-INS-01', category: 'Services', unitPrice: 50000, cost: 25000, description: 'On-premises deployment and network wiring' },
      { name: '24/7 Dedicated Cloud Support', sku: 'SV-SUP-247', category: 'Services', unitPrice: 75000, cost: 40000, description: 'SLA 1-hour priority support & incident management' },
      { name: 'Annual Hardware Maintenance Plan', sku: 'SV-MNT-ANN', category: 'Services', unitPrice: 60000, cost: 30000, description: 'Comprehensive hardware replacement warranty' }
    ]);

    console.log('Seeding Price Lists...');
    await PriceList.insertMany([
      { product: products[0]._id, customerTier: 'Gold', salesPrice: 80000 },
      { product: products[0]._id, customerTier: 'Silver', salesPrice: 82500 },
      { product: products[0]._id, customerTier: 'Bronze', salesPrice: 85000 },
      { product: products[1]._id, customerTier: 'Gold', salesPrice: 330000 },
      { product: products[1]._id, customerTier: 'Silver', salesPrice: 340000 }
    ]);

    console.log('Seeding Warehouses & Inventory...');
    const whAlpha = await Warehouse.create({ name: 'Alpha Hub - Mumbai', location: 'Bhiwandi, Thane', capacity: 10000, contactPerson: 'Ramesh Patil' });
    const whBeta = await Warehouse.create({ name: 'Beta Hub - Bangalore', location: 'Peenya Industrial Area', capacity: 8000, contactPerson: 'Manjunath K' });
    const whGamma = await Warehouse.create({ name: 'Gamma Hub - Delhi NCR', location: 'Gurgaon Sector 37', capacity: 6000, contactPerson: 'Harish Malik' });

    // Populate inventory across warehouses
    await Inventory.insertMany([
      { warehouse: whAlpha._id, product: products[0]._id, stockQuantity: 25, reservedQuantity: 5 },
      { warehouse: whBeta._id, product: products[0]._id, stockQuantity: 15, reservedQuantity: 2 },
      { warehouse: whGamma._id, product: products[0]._id, stockQuantity: 5, reservedQuantity: 0 },
      
      { warehouse: whAlpha._id, product: products[1]._id, stockQuantity: 4, reservedQuantity: 1 },
      { warehouse: whBeta._id, product: products[1]._id, stockQuantity: 2, reservedQuantity: 0 },

      { warehouse: whAlpha._id, product: products[2]._id, stockQuantity: 30, reservedQuantity: 4 },
      { warehouse: whBeta._id, product: products[2]._id, stockQuantity: 20, reservedQuantity: 1 }
    ]);

    console.log('Seeding 15+ Quotations & Approval Workflows...');
    const sampleQuotes = [
      {
        quoteNumber: 'Q-1001',
        customer: customers[0]._id, // Acme - Gold
        salesRep: repRahul._id,
        items: [
          { product: products[0]._id, quantity: 10, unitPrice: 85000, discountPercent: 12, finalUnitPrice: 74800, lineTotal: 748000, allowedDiscountPercent: 15, approvalRequired: false },
          { product: products[4]._id, quantity: 2, unitPrice: 50000, discountPercent: 8, finalUnitPrice: 46000, lineTotal: 92000, allowedDiscountPercent: 10, approvalRequired: false }
        ],
        subtotal: 950000,
        totalDiscount: 110000,
        tax: 151200,
        grandTotal: 991200,
        status: 'Approved',
        riskScore: 20,
        riskLevel: 'LOW',
        riskReasons: ['Large deal value (+20)'],
        approvalChainState: 'APPROVED'
      },
      {
        quoteNumber: 'Q-1002',
        customer: customers[1]._id, // TechNova - Silver
        salesRep: repRahul._id,
        items: [
          { product: products[1]._id, quantity: 2, unitPrice: 350000, discountPercent: 18, finalUnitPrice: 287000, lineTotal: 574000, allowedDiscountPercent: 10, approvalRequired: true, breachReason: 'Discount (18%) exceeds Silver tier limit (10%) by 8 percentage points.' }
        ],
        subtotal: 700000,
        totalDiscount: 126000,
        tax: 103320,
        grandTotal: 677320,
        status: 'Pending Approval',
        riskScore: 80,
        riskLevel: 'HIGH',
        riskReasons: ['Discount exceeds allowed limit (+40)', 'Large deal value (+20)', 'High item discount exceeds 25% (+20)'],
        approvalChainState: 'FINANCE_OPERATIONS'
      },
      {
        quoteNumber: 'Q-1003',
        customer: customers[2]._id, // Global Systems - Bronze
        salesRep: repPriya._id,
        items: [
          { product: products[0]._id, quantity: 5, unitPrice: 85000, discountPercent: 5, finalUnitPrice: 80750, lineTotal: 403750, allowedDiscountPercent: 5, approvalRequired: false }
        ],
        subtotal: 425000,
        totalDiscount: 21250,
        tax: 72675,
        grandTotal: 476425,
        status: 'Negotiation',
        riskScore: 10,
        riskLevel: 'LOW',
        riskReasons: ['Active customer negotiation (+10)'],
        approvalChainState: 'NONE'
      },
      {
        quoteNumber: 'Q-1004',
        customer: customers[3]._id, // Urban Retail - Gold
        salesRep: repPriya._id,
        items: [
          { product: products[0]._id, quantity: 20, unitPrice: 85000, discountPercent: 14, finalUnitPrice: 73100, lineTotal: 1462000, allowedDiscountPercent: 15, approvalRequired: false },
          { product: products[2]._id, quantity: 15, unitPrice: 45000, discountPercent: 10, finalUnitPrice: 40500, lineTotal: 607500, allowedDiscountPercent: 15, approvalRequired: false }
        ],
        subtotal: 2375000,
        totalDiscount: 305500,
        tax: 372510,
        grandTotal: 2441510,
        status: 'Fulfillment',
        riskScore: 20,
        riskLevel: 'LOW',
        riskReasons: ['Large deal value (+20)'],
        approvalChainState: 'APPROVED'
      },
      {
        quoteNumber: 'Q-1005',
        customer: customers[4]._id, // Nova - Silver
        salesRep: repAman._id,
        items: [
          { product: products[3]._id, quantity: 10, unitPrice: 120000, discountPercent: 22, finalUnitPrice: 93600, lineTotal: 936000, allowedDiscountPercent: 10, approvalRequired: true, breachReason: 'Discount (22%) exceeds limit by 12 points.' }
        ],
        subtotal: 1200000,
        totalDiscount: 264000,
        tax: 168480,
        grandTotal: 1104480,
        status: 'Pending Approval',
        riskScore: 60,
        riskLevel: 'HIGH',
        riskReasons: ['Discount exceeds allowed limit (+40)', 'Large deal value (+20)'],
        approvalChainState: 'SALES_MANAGER'
      },
      {
        quoteNumber: 'Q-1006',
        customer: customers[0]._id,
        salesRep: repAman._id,
        items: [{ product: products[5]._id, quantity: 1, unitPrice: 75000, discountPercent: 5, finalUnitPrice: 71250, lineTotal: 71250, allowedDiscountPercent: 10, approvalRequired: false }],
        subtotal: 75000,
        totalDiscount: 3750,
        tax: 12825,
        grandTotal: 84075,
        status: 'Completed',
        riskScore: 0,
        riskLevel: 'LOW',
        riskReasons: [],
        approvalChainState: 'APPROVED'
      },
      {
        quoteNumber: 'Q-1007',
        customer: customers[1]._id,
        salesRep: repNeha._id,
        items: [{ product: products[2]._id, quantity: 4, unitPrice: 45000, discountPercent: 8, finalUnitPrice: 41400, lineTotal: 165600, allowedDiscountPercent: 10, approvalRequired: false }],
        subtotal: 180000,
        totalDiscount: 14400,
        tax: 29808,
        grandTotal: 195408,
        status: 'Draft',
        riskScore: 0,
        riskLevel: 'LOW',
        riskReasons: [],
        approvalChainState: 'NONE'
      },
      {
        quoteNumber: 'Q-1008',
        customer: customers[2]._id,
        salesRep: repNeha._id,
        items: [{ product: products[0]._id, quantity: 2, unitPrice: 85000, discountPercent: 18, finalUnitPrice: 69700, lineTotal: 139400, allowedDiscountPercent: 5, approvalRequired: true }],
        subtotal: 170000,
        totalDiscount: 30600,
        tax: 25092,
        grandTotal: 164492,
        status: 'Rejected',
        riskScore: 40,
        riskLevel: 'MEDIUM',
        riskReasons: ['Discount exceeds allowed limit (+40)'],
        approvalChainState: 'REJECTED'
      }
    ];

    const insertedQuotes = await Quotation.insertMany(sampleQuotes);

    console.log('Seeding Approvals & Audit Trail...');
    const approval1 = await Approval.create({
      quotation: insertedQuotes[1]._id, // Q-1002
      salesRep: repRahul._id,
      currentStep: 'FINANCE_OPERATIONS',
      riskScore: 80,
      riskLevel: 'HIGH',
      riskReasons: ['Discount exceeds allowed limit (+40)', 'Large deal value (+20)', 'High item discount exceeds 25% (+20)'],
      managerApproval: {
        status: 'APPROVED',
        approvedBy: manager._id,
        comment: 'Strategic client account. Forwarded to Finance for high discount approval.',
        actionDate: new Date(Date.now() - 3600000)
      },
      financeApproval: { status: 'PENDING' },
      auditTrail: [
        { user: repRahul._id, action: 'SUBMITTED', role: 'SALES_REP', reason: 'Initial quote submission' },
        { user: manager._id, action: 'APPROVED_BY_MANAGER', role: 'SALES_MANAGER', reason: 'Approved by Sales Manager. Requires Finance signoff.' }
      ]
    });

    console.log('Seeding Fulfillments & Backorders...');
    const fulfillment1 = await Fulfillment.create({
      quotation: insertedQuotes[3]._id, // Q-1004 (20 laptops required)
      customer: customers[3]._id,
      status: 'Partially Fulfilled',
      items: [
        {
          product: products[0]._id, // Laptops
          requestedQuantity: 20,
          fulfilledQuantity: 15,
          backorderQuantity: 5,
          allocations: [
            { warehouse: whAlpha._id, quantity: 10 },
            { warehouse: whBeta._id, quantity: 5 }
          ]
        },
        {
          product: products[2]._id, // Monitors
          requestedQuantity: 15,
          fulfilledQuantity: 15,
          backorderQuantity: 0,
          allocations: [
            { warehouse: whAlpha._id, quantity: 15 }
          ]
        }
      ]
    });

    const backorder1 = await Backorder.create({
      fulfillment: fulfillment1._id,
      quotation: insertedQuotes[3]._id,
      customer: customers[3]._id,
      product: products[0]._id,
      quantity: 5,
      status: 'Pending',
      estimatedArrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    });

    console.log('Seeding Invoices (Partial Billing Reconciliation)...');
    await Invoice.create({
      invoiceNumber: 'INV-2001',
      quotation: insertedQuotes[3]._id,
      fulfillment: fulfillment1._id,
      customer: customers[3]._id,
      items: [
        { product: products[0]._id, shippedQuantity: 15, unitPrice: 73100, lineTotal: 1096500 },
        { product: products[2]._id, shippedQuantity: 15, unitPrice: 40500, lineTotal: 607500 }
      ],
      subtotal: 1704000,
      tax: 306720,
      grandTotal: 2010720,
      paymentStatus: 'Partial',
      amountPaid: 1000000,
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      reconciliationNotes: 'Partial billing for 15 laptops and 15 monitors delivered. 5 laptops backordered.'
    });

    console.log('Seeding Subscriptions...');
    await Subscription.create({
      subscriptionNumber: 'SUB-3001',
      customer: customers[0]._id, // Acme
      product: products[3]._id, // Enterprise License
      planName: 'DealFlow Enterprise License - 100 Seats',
      billingCycle: 'Yearly',
      amount: 1200000,
      status: 'Active',
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      nextBillingDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
      billingHistory: [
        { invoiceNumber: 'SUB-INV-101', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), amount: 1200000, status: 'Paid' }
      ]
    });

    console.log('Seeding Customer Negotiation Threads...');
    await Negotiation.create({
      quotation: insertedQuotes[2]._id, // Q-1003
      customer: customers[2]._id,
      salesRep: repPriya._id,
      status: 'Open',
      messages: [
        {
          sender: customerUser2._id,
          senderRole: 'CUSTOMER',
          itemIndex: 0,
          message: 'Could you offer a 10% discount on the Business Laptops instead of 5%?',
          counterDiscountPercent: 10,
          timestamp: new Date(Date.now() - 7200000)
        },
        {
          sender: repPriya._id,
          senderRole: 'SALES_REP',
          itemIndex: 0,
          message: 'Let me review this with our manager to get approval for 10% for Global Systems.',
          timestamp: new Date(Date.now() - 3600000)
        }
      ]
    });

    console.log('=======================================================');
    console.log(' DealFlow360 Seed Data successfully populated!         ');
    console.log('=======================================================');
    return true;
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
};

if (require.main === module) {
  seedData().then(() => mongoose.connection.close());
}

module.exports = seedData;
