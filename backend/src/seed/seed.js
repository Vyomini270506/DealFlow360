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
const CustomerRequest = require('../models/CustomerRequest');

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    console.log('Wiping database collections for clean 12-user demo dataset...');

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
      Negotiation.deleteMany({}),
      CustomerRequest.deleteMany({})
    ]);

    console.log('Seeding Discount Tiers & Category Limits...');
    await DiscountTier.insertMany([
      { tier: 'Bronze', maxDiscountPercentage: 5 },
      { tier: 'Silver', maxDiscountPercentage: 10 },
      { tier: 'Gold', maxDiscountPercentage: 15 }
    ]);

    await CategoryLimit.insertMany([
      { category: 'Hardware', maxDiscountPercentage: 15 },
      { category: 'Services', maxDiscountPercentage: 10 },
      { category: 'Software', maxDiscountPercentage: 20 }
    ]);

    console.log('Seeding Products...');
    const products = await Product.insertMany([
      { name: 'Business Laptop Pro 15', sku: 'HW-LAP-01', category: 'Hardware', unitPrice: 85000, cost: 62000, description: 'High performance Intel i7, 32GB RAM, 1TB SSD' },
      { name: 'Enterprise Rack Server X4', sku: 'HW-SRV-04', category: 'Hardware', unitPrice: 350000, cost: 260000, description: 'Dual Xeon Silver, 128GB RAM, 4TB NVMe Raid' },
      { name: '4K UltraWide Monitor 34"', sku: 'HW-MON-34', category: 'Hardware', unitPrice: 45000, cost: 31000, description: '34-inch Curved IPS, USB-C Docking Hub' },
      { name: 'DealFlow Enterprise License', sku: 'SW-LIC-ENT', category: 'Software', unitPrice: 120000, cost: 20000, description: 'Annual per-user enterprise SaaS subscription' },
      { name: 'On-Site Server Installation Service', sku: 'SV-INS-01', category: 'Services', unitPrice: 50000, cost: 25000, description: 'On-premises deployment and network wiring' }
    ]);

    console.log('Seeding 12 Exact Demo Users & Team Hierarchy...');

    // 1. Admin (1)
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@dealflow360.com',
      password: 'password123',
      role: 'ADMIN'
    });

    // 2. Sales Managers (2)
    const salesManagerA = await User.create({
      name: 'Sales Manager A',
      email: 'manager.a@dealflow360.com',
      password: 'password123',
      role: 'SALES_MANAGER',
      pipelineTarget: 5000000
    });

    const salesManagerB = await User.create({
      name: 'Sales Manager B',
      email: 'manager.b@dealflow360.com',
      password: 'password123',
      role: 'SALES_MANAGER',
      pipelineTarget: 4000000
    });

    // 3. Sales Representatives (3)
    const salesRepA = await User.create({
      name: 'Sales Rep A',
      email: 'salesrep.a@dealflow360.com',
      password: 'password123',
      role: 'SALES_REP',
      salesManagerId: salesManagerA._id,
      pipelineTarget: 1500000
    });

    const salesRepB = await User.create({
      name: 'Sales Rep B',
      email: 'salesrep.b@dealflow360.com',
      password: 'password123',
      role: 'SALES_REP',
      salesManagerId: salesManagerA._id,
      pipelineTarget: 1200000
    });

    const salesRepC = await User.create({
      name: 'Sales Rep C',
      email: 'salesrep.c@dealflow360.com',
      password: 'password123',
      role: 'SALES_REP',
      salesManagerId: salesManagerB._id,
      pipelineTarget: 1000000
    });

    // 4. Finance / Operations Users (2)
    const financeOpsA = await User.create({
      name: 'Finance/Operations A',
      email: 'finance.a@dealflow360.com',
      password: 'password123',
      role: 'FINANCE_OPERATIONS'
    });

    const financeOpsB = await User.create({
      name: 'Finance/Operations B',
      email: 'finance.b@dealflow360.com',
      password: 'password123',
      role: 'FINANCE_OPERATIONS'
    });

    // 5. Customers Documents (4)
    const customerDocA = await Customer.create({
      name: 'Customer A',
      email: 'customer.a@acmecorp.com',
      company: 'Acme Corp',
      tier: 'Gold',
      phone: '+91 9876543210',
      address: 'Bandra Kurla Complex, Mumbai',
      assignedSalesManager: salesManagerA._id,
      assignedSalesRepresentative: salesRepA._id,
      assignmentStatus: 'REP_ASSIGNED',
      assignedAt: new Date()
    });

    const customerDocB = await Customer.create({
      name: 'Customer B',
      email: 'customer.b@technova.io',
      company: 'TechNova',
      tier: 'Silver',
      phone: '+91 9812345678',
      address: 'Koramangala, Bangalore',
      assignedSalesManager: salesManagerA._id,
      assignedSalesRepresentative: salesRepB._id,
      assignmentStatus: 'REP_ASSIGNED',
      assignedAt: new Date()
    });

    const customerDocC = await Customer.create({
      name: 'Customer C',
      email: 'customer.c@globalsys.com',
      company: 'Global Systems',
      tier: 'Bronze',
      phone: '+91 9988776655',
      address: 'Cyber City, Gurgaon',
      assignedSalesManager: salesManagerB._id,
      assignedSalesRepresentative: salesRepC._id,
      assignmentStatus: 'REP_ASSIGNED',
      assignedAt: new Date()
    });

    const customerDocD = await Customer.create({
      name: 'Customer D',
      email: 'customer.d@urbanretail.in',
      company: 'Urban Retail',
      tier: 'Gold',
      phone: '+91 9711223344',
      address: 'Connaught Place, New Delhi',
      assignedSalesManager: salesManagerA._id,
      assignedSalesRepresentative: salesRepA._id,
      assignmentStatus: 'REP_ASSIGNED',
      assignedAt: new Date()
    });

    // 6. Customers User Accounts (4)
    const customerUserA = await User.create({
      name: 'Customer A (Acme Corp)',
      email: 'customer.a@acmecorp.com',
      password: 'password123',
      role: 'CUSTOMER',
      customerId: customerDocA._id
    });

    const customerUserB = await User.create({
      name: 'Customer B (TechNova)',
      email: 'customer.b@technova.io',
      password: 'password123',
      role: 'CUSTOMER',
      customerId: customerDocB._id
    });

    const customerUserC = await User.create({
      name: 'Customer C (Global Systems)',
      email: 'customer.c@globalsys.com',
      password: 'password123',
      role: 'CUSTOMER',
      customerId: customerDocC._id
    });

    const customerUserD = await User.create({
      name: 'Customer D (Urban Retail)',
      email: 'customer.d@urbanretail.in',
      password: 'password123',
      role: 'CUSTOMER',
      customerId: customerDocD._id
    });

    console.log('Seeding Warehouses & Inventory...');
    const warehouseAlpha = await Warehouse.create({ name: 'Alpha Hub - Mumbai', location: 'Bhiwandi, Thane', capacity: 10000, contactPerson: 'Ramesh Patil' });
    const warehouseBeta = await Warehouse.create({ name: 'Beta Hub - Bangalore', location: 'Peenya Industrial Area', capacity: 8000, contactPerson: 'Manjunath K' });

    await Inventory.insertMany([
      { warehouse: warehouseAlpha._id, product: products[0]._id, stockQuantity: 50, reservedQuantity: 5 },
      { warehouse: warehouseBeta._id, product: products[0]._id, stockQuantity: 30, reservedQuantity: 2 },
      { warehouse: warehouseAlpha._id, product: products[1]._id, stockQuantity: 10, reservedQuantity: 1 },
      { warehouse: warehouseAlpha._id, product: products[2]._id, stockQuantity: 40, reservedQuantity: 4 }
    ]);

    console.log('Seeding Customer Product Requests (Linked to Demo Users)...');
    const req1 = await CustomerRequest.create({
      requestNumber: 'REQ-1001',
      customer: customerDocA._id,
      user: customerUserA._id,
      assignedSalesRep: salesRepA._id,
      items: [{ product: products[0]._id, quantity: 5, desiredDiscountPercent: 4 }],
      message: 'Need 5 Business Laptops for our engineering team.',
      status: 'Submitted',
      riskScore: 10,
      riskLevel: 'LOW',
      riskReasons: ['Standard discount within Gold tier limit (5%)']
    });

    const req2 = await CustomerRequest.create({
      requestNumber: 'REQ-1002',
      customer: customerDocB._id,
      user: customerUserB._id,
      assignedSalesRep: salesRepB._id,
      items: [{ product: products[1]._id, quantity: 2, desiredDiscountPercent: 18 }],
      message: 'Requesting 18% discount for enterprise rack servers.',
      status: 'Escalated_Manager',
      riskScore: 85,
      riskLevel: 'HIGH',
      riskReasons: ['Discount (18%) exceeds Silver tier limit (10%) by 8 points.', 'High order value'],
      escalationReason: 'Discount exceeds baseline silver tier limit. Compulsory manager approval required.'
    });

    const req3 = await CustomerRequest.create({
      requestNumber: 'REQ-1003',
      customer: customerDocC._id,
      user: customerUserC._id,
      assignedSalesRep: salesRepC._id,
      items: [{ product: products[2]._id, quantity: 10, desiredDiscountPercent: 12 }],
      message: 'Bulk discount request for 10 monitors.',
      status: 'Escalated_Manager',
      riskScore: 55,
      riskLevel: 'MEDIUM',
      riskReasons: ['Discount (12%) exceeds Bronze tier limit (5%) by 7 points.'],
      escalationReason: 'Medium risk bulk order discount escalation for Sales Manager B.'
    });

    const req4 = await CustomerRequest.create({
      requestNumber: 'REQ-1004',
      customer: customerDocD._id,
      user: customerUserD._id,
      assignedSalesRep: salesRepA._id,
      items: [{ product: products[3]._id, quantity: 1, desiredDiscountPercent: 5 }],
      message: 'Annual license renewal request.',
      status: 'Submitted',
      riskScore: 15,
      riskLevel: 'LOW',
      riskReasons: ['Low risk standard SaaS license request']
    });

    console.log('Seeding Quotations (Linked to Demo Users)...');
    const quote1 = await Quotation.create({
      quoteNumber: 'Q-1001',
      customer: customerDocA._id,
      customerRequest: req1._id,
      salesRep: salesRepA._id,
      assignedSalesManager: salesManagerA._id,
      items: [
        { product: products[0]._id, quantity: 5, unitPrice: 85000, discountPercent: 12, finalUnitPrice: 74800, lineTotal: 374000, allowedDiscountPercent: 15, approvalRequired: false }
      ],
      subtotal: 425000,
      totalDiscount: 51000,
      tax: 67320,
      grandTotal: 441320,
      status: 'Approved',
      riskScore: 10,
      riskLevel: 'LOW',
      riskReasons: [],
      approvalChainState: 'APPROVED',
      notes: 'Initial quotation created for Acme Corp'
    });

    const quote2 = await Quotation.create({
      quoteNumber: 'Q-1002',
      customer: customerDocB._id,
      customerRequest: req2._id,
      salesRep: salesRepB._id,
      assignedSalesManager: salesManagerA._id,
      items: [
        { product: products[1]._id, quantity: 2, unitPrice: 350000, discountPercent: 18, finalUnitPrice: 287000, lineTotal: 574000, allowedDiscountPercent: 10, approvalRequired: true, breachReason: 'Discount (18%) exceeds Silver limit (10%)' }
      ],
      subtotal: 700000,
      totalDiscount: 126000,
      tax: 103320,
      grandTotal: 677320,
      status: 'Pending Approval',
      riskScore: 80,
      riskLevel: 'HIGH',
      riskReasons: ['Discount exceeds allowed limit (+40)', 'Large deal value (+20)'],
      approvalChainState: 'SALES_MANAGER'
    });

    console.log('Seeding Approvals...');
    await Approval.create({
      quotation: quote2._id,
      customerRequest: req2._id,
      customer: customerDocB._id,
      salesRep: salesRepB._id,
      salesManager: salesManagerA._id,
      requestedDiscount: 18,
      allowedDiscount: 10,
      currentStep: 'SALES_MANAGER',
      riskScore: 80,
      riskLevel: 'HIGH',
      riskReasons: ['Discount exceeds Silver tier limit (+40)'],
      managerApproval: { status: 'PENDING' },
      auditTrail: [
        { user: salesRepB._id, action: 'SUBMITTED', role: 'SALES_REP', reason: 'Quotation submitted for manager signoff' }
      ]
    });

    console.log('Seeding Negotiations...');
    await Negotiation.create({
      quotation: quote1._id,
      customer: customerDocA._id,
      salesRep: salesRepA._id,
      status: 'Open',
      currentRequestedDiscount: 14,
      messages: [
        {
          sender: customerUserA._id,
          senderRole: 'CUSTOMER',
          itemIndex: 0,
          message: 'Can you provide 14% discount for 5 units of Business Laptops?',
          counterDiscountPercent: 14,
          timestamp: new Date(Date.now() - 3600000)
        }
      ]
    });

    console.log('Seeding Invoices & Subscriptions...');
    await Invoice.create({
      invoiceNumber: 'INV-2001',
      quotation: quote1._id,
      customer: customerDocA._id,
      items: [
        { product: products[0]._id, shippedQuantity: 5, unitPrice: 74800, lineTotal: 374000 }
      ],
      subtotal: 374000,
      tax: 67320,
      grandTotal: 441320,
      paymentStatus: 'Unpaid',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });

    await Subscription.create({
      subscriptionNumber: 'SUB-3001',
      customer: customerDocA._id,
      product: products[3]._id,
      planName: 'DealFlow Enterprise License - 50 Seats',
      billingCycle: 'Yearly',
      amount: 600000,
      status: 'Active',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextBillingDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000)
    });

    console.log('=======================================================');
    console.log(' DealFlow360 12-Demo Users Dataset Created Successfully! ');
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
