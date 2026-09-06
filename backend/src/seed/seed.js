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
const Order = require('../models/Order');
const { finalizeClosedDeal } = require('../services/dealClosureService');

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ email: 'admin@dealflow360.com' });
    const isForce = process.argv.includes('--force');

    if (existingAdmin && !isForce) {
      console.log('Database already contains demo data. Skipping seed.');
      process.exit(0);
      return;
    }

    console.log('Clearing database collections for clean 12-user demo dataset...');


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
      CustomerRequest.deleteMany({}),
      Order.deleteMany({})
    ]);

    console.log('Seeding Discount Tiers & Category Limits...');
    await DiscountTier.insertMany([
      { tier: 'Iron', maxDiscountPercentage: 3 },
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
      { name: 'Business Laptop Pro 15', sku: 'HW-LAP-01', category: 'Hardware', type: 'ONE_TIME', billingFrequency: 'NONE', unitPrice: 85000, cost: 62000, description: 'High performance Intel i7, 32GB RAM, 1TB SSD' },
      { name: 'Enterprise Rack Server X4', sku: 'HW-SRV-04', category: 'Hardware', type: 'ONE_TIME', billingFrequency: 'NONE', unitPrice: 350000, cost: 260000, description: 'Dual Xeon Silver, 128GB RAM, 4TB NVMe Raid' },
      { name: '4K UltraWide Monitor 34"', sku: 'HW-MON-34', category: 'Hardware', type: 'ONE_TIME', billingFrequency: 'NONE', unitPrice: 45000, cost: 31000, description: '34-inch Curved IPS, USB-C Docking Hub' },
      { name: 'DealFlow Enterprise SaaS License', sku: 'SW-LIC-ENT', category: 'Software', type: 'RECURRING', billingFrequency: 'ANNUALLY', unitPrice: 120000, cost: 20000, description: 'Annual per-user enterprise SaaS subscription' },
      { name: '24/7 Priority Cloud Support SLA', sku: 'SV-INS-01', category: 'Services', type: 'RECURRING', billingFrequency: 'MONTHLY', unitPrice: 50000, cost: 25000, description: '24/7 Priority technical escalation SLA & cloud management' },
      { name: 'Automated Threat Defense Suite', sku: 'SW-SEC-DEF', category: 'Software', type: 'RECURRING', billingFrequency: 'QUARTERLY', unitPrice: 75000, cost: 30000, description: 'Quarterly network & endpoint security monitoring software' }
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

    console.log('Seeding Comprehensive Transactional Data & Real MongoDB Orders...');

    // 1. SCENARIO 1: Closed Deal (Acme Corp - Gold Tier, Sales Rep A, Manager A)
    const req1 = await CustomerRequest.create({
      requestNumber: 'REQ-1001',
      customer: customerDocA._id,
      user: customerUserA._id,
      assignedSalesRep: salesRepA._id,
      items: [
        { product: products[0]._id, quantity: 5, desiredDiscountPercent: 10 },
        { product: products[3]._id, quantity: 1, desiredDiscountPercent: 5 }
      ],
      message: 'Procuring 5 Business Laptops and 1 Enterprise License for Q3 rollout.',
      status: 'Closed',
      riskScore: 15,
      riskLevel: 'LOW',
      riskReasons: ['Gold tier customer within allowable discount ceiling']
    });

    const quote1 = await Quotation.create({
      quoteNumber: 'Q-1001',
      customerRequest: req1._id,
      customer: customerDocA._id,
      salesRep: salesRepA._id,
      assignedSalesManager: salesManagerA._id,
      items: [
        { product: products[0]._id, quantity: 5, unitPrice: 85000, discountPercent: 10, finalUnitPrice: 76500, lineTotal: 382500, allowedDiscountPercent: 15, approvalRequired: false },
        { product: products[3]._id, quantity: 1, unitPrice: 120000, discountPercent: 5, finalUnitPrice: 114000, lineTotal: 114000, allowedDiscountPercent: 20, approvalRequired: false }
      ],
      subtotal: 496500,
      totalDiscount: 48500,
      tax: 89370,
      grandTotal: 585870,
      status: 'Closed',
      riskScore: 15,
      riskLevel: 'LOW',
      approvalChainState: 'APPROVED',
      acceptedBy: customerUserA._id,
      acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    });

    await Negotiation.create({
      quotation: quote1._id,
      customerRequest: req1._id,
      customer: customerDocA._id,
      salesRep: salesRepA._id,
      salesManager: salesManagerA._id,
      status: 'Closed',
      customerConfirmation: { status: 'CONFIRMED', confirmedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      salesRepConfirmation: { status: 'CONFIRMED', confirmedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      messages: [
        { sender: customerUserA._id, senderRole: 'CUSTOMER', message: 'Requesting 10% discount on laptops.', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        { sender: salesRepA._id, senderRole: 'SALES_REP', message: 'Approved 10% discount for Gold Tier partner.', timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) }
      ]
    });

    // Execute automated post-closure pipeline for Quote 1 -> Generates Order, Invoice, Subscription & Fulfillment
    const closure1 = await finalizeClosedDeal({ quotationId: quote1._id, userId: salesRepA._id, userRole: 'SALES_REP' });
    if (closure1.invoice) {
      closure1.invoice.paymentStatus = 'PAID';
      closure1.invoice.amountPaid = closure1.invoice.grandTotal;
      await closure1.invoice.save();
    }


    // 2. SCENARIO 2: Closed Deal with Partial Stock / Backorder (TechNova - Silver Tier, Sales Rep B, Manager A)
    const req2 = await CustomerRequest.create({
      requestNumber: 'REQ-1002',
      customer: customerDocB._id,
      user: customerUserB._id,
      assignedSalesRep: salesRepB._id,
      items: [
        { product: products[2]._id, quantity: 50, desiredDiscountPercent: 8 }
      ],
      message: 'Bulk procurement of 50 4K UltraWide Monitors.',
      status: 'Closed',
      riskScore: 25,
      riskLevel: 'LOW',
      riskReasons: ['Bulk quantity order']
    });

    const quote2 = await Quotation.create({
      quoteNumber: 'Q-1002',
      customerRequest: req2._id,
      customer: customerDocB._id,
      salesRep: salesRepB._id,
      assignedSalesManager: salesManagerA._id,
      items: [
        { product: products[2]._id, quantity: 50, unitPrice: 45000, discountPercent: 8, finalUnitPrice: 41400, lineTotal: 2070000, allowedDiscountPercent: 10, approvalRequired: false }
      ],
      subtotal: 2070000,
      totalDiscount: 180000,
      tax: 372600,
      grandTotal: 2442600,
      status: 'Closed',
      riskScore: 25,
      riskLevel: 'LOW',
      approvalChainState: 'APPROVED',
      acceptedBy: customerUserB._id,
      acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    });

    const closure2 = await finalizeClosedDeal({ quotationId: quote2._id, userId: salesRepB._id, userRole: 'SALES_REP' });
    if (closure2.invoice) {
      closure2.invoice.paymentStatus = 'PARTIALLY_PAID';
      closure2.invoice.amountPaid = 1200000;
      await closure2.invoice.save();
    }


    // 3. SCENARIO 3: High-Risk Deal Pending Finance & Manager Review (Global Systems - Bronze Tier, Sales Rep C, Manager B)
    const req3 = await CustomerRequest.create({
      requestNumber: 'REQ-1003',
      customer: customerDocC._id,
      user: customerUserC._id,
      assignedSalesRep: salesRepC._id,
      items: [
        { product: products[1]._id, quantity: 4, desiredDiscountPercent: 22 }
      ],
      message: 'High performance datacenter servers - asking 22% discount.',
      status: 'Escalated_Manager',
      riskScore: 85,
      riskLevel: 'HIGH',
      riskReasons: ['Discount (22%) exceeds Bronze tier limit (5%) by 17 points', 'Large deal size'],
      escalationReason: 'Discount exceeds baseline Bronze tier limit (+17%). Compulsory Manager & Finance approval required.'
    });

    const quote3 = await Quotation.create({
      quoteNumber: 'Q-1003',
      customerRequest: req3._id,
      customer: customerDocC._id,
      salesRep: salesRepC._id,
      assignedSalesManager: salesManagerB._id,
      items: [
        { product: products[1]._id, quantity: 4, unitPrice: 350000, discountPercent: 22, finalUnitPrice: 273000, lineTotal: 1092000, allowedDiscountPercent: 5, approvalRequired: true, breachReason: 'Discount exceeds Bronze limit by 17%' }
      ],
      subtotal: 1092000,
      totalDiscount: 308000,
      tax: 196560,
      grandTotal: 1288560,
      status: 'Pending Approval',
      riskScore: 85,
      riskLevel: 'HIGH',
      riskReasons: ['Excess discount (+17%)', 'High overall transaction value'],
      approvalChainState: 'FINANCE_OPERATIONS'
    });

    await Approval.create({
      quotation: quote3._id,
      customerRequest: req3._id,
      customer: customerDocC._id,
      salesRep: salesRepC._id,
      salesManager: salesManagerB._id,
      requestedDiscount: 22,
      allowedDiscount: 5,
      currentStep: 'FINANCE_OPERATIONS',
      riskScore: 85,
      riskLevel: 'HIGH',
      riskReasons: ['Discount exceeds Bronze tier limit (+17%)'],
      managerApproval: {
        status: 'APPROVED',
        approvedBy: salesManagerB._id,
        approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        comment: 'Sales Manager B recommends approval due to strategic expansion in Gurgaon.'
      },
      financeApproval: {
        status: 'PENDING',
        comment: 'Awaiting Finance Controller sign-off on 22% margin erosion.'
      },
      auditTrail: [
        { user: salesRepC._id, action: 'SUBMITTED', role: 'SALES_REP', reason: 'Submitted high-discount request for signoff' },
        { user: salesManagerB._id, action: 'APPROVED_BY_MANAGER', role: 'SALES_MANAGER', reason: 'Manager signoff granted, forwarded to Finance' }
      ]
    });


    // 4. SCENARIO 4: Active Customer Negotiation (Urban Retail - Gold Tier, Sales Rep A, Manager A)
    const req4 = await CustomerRequest.create({
      requestNumber: 'REQ-1004',
      customer: customerDocD._id,
      user: customerUserD._id,
      assignedSalesRep: salesRepA._id,
      items: [
        { product: products[0]._id, quantity: 10, desiredDiscountPercent: 14 },
        { product: products[4]._id, quantity: 2, desiredDiscountPercent: 10 }
      ],
      message: 'POS terminal upgrade for retail outlets.',
      status: 'Negotiation_Required',
      riskScore: 35,
      riskLevel: 'MEDIUM',
      riskReasons: ['Custom service packaging request']
    });

    const quote4 = await Quotation.create({
      quoteNumber: 'Q-1004',
      customerRequest: req4._id,
      customer: customerDocD._id,
      salesRep: salesRepA._id,
      assignedSalesManager: salesManagerA._id,
      items: [
        { product: products[0]._id, quantity: 10, unitPrice: 85000, discountPercent: 12, finalUnitPrice: 74800, lineTotal: 748000, allowedDiscountPercent: 15, approvalRequired: false },
        { product: products[4]._id, quantity: 2, unitPrice: 50000, discountPercent: 10, finalUnitPrice: 45000, lineTotal: 90000, allowedDiscountPercent: 10, approvalRequired: false }
      ],
      subtotal: 838000,
      totalDiscount: 112000,
      tax: 150840,
      grandTotal: 988840,
      status: 'Negotiation',
      riskScore: 35,
      riskLevel: 'MEDIUM',
      approvalChainState: 'NONE'
    });

    await Negotiation.create({
      quotation: quote4._id,
      customerRequest: req4._id,
      customer: customerDocD._id,
      salesRep: salesRepA._id,
      salesManager: salesManagerA._id,
      status: 'Active',
      customerConfirmation: { status: 'PENDING' },
      salesRepConfirmation: { status: 'PENDING' },
      messages: [
        { sender: customerUserD._id, senderRole: 'CUSTOMER', message: 'Can you match 14% discount across both laptops and installation?', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { sender: salesRepA._id, senderRole: 'SALES_REP', message: 'We can offer 12% on laptops and 10% on installation services with complimentary support.', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
      ]
    });


    // 5. SCENARIO 5: Approved Deal Ready for Customer Acceptance (Acme Corp - Gold Tier, Sales Rep A)
    const req5 = await CustomerRequest.create({
      requestNumber: 'REQ-1005',
      customer: customerDocA._id,
      user: customerUserA._id,
      assignedSalesRep: salesRepA._id,
      items: [
        { product: products[1]._id, quantity: 1, desiredDiscountPercent: 12 }
      ],
      message: 'Additional rack server for disaster recovery site.',
      status: 'Submitted',
      riskScore: 20,
      riskLevel: 'LOW'
    });

    await Quotation.create({
      quoteNumber: 'Q-1005',
      customerRequest: req5._id,
      customer: customerDocA._id,
      salesRep: salesRepA._id,
      assignedSalesManager: salesManagerA._id,
      items: [
        { product: products[1]._id, quantity: 1, unitPrice: 350000, discountPercent: 12, finalUnitPrice: 308000, lineTotal: 308000, allowedDiscountPercent: 15, approvalRequired: false }
      ],
      subtotal: 308000,
      totalDiscount: 42000,
      tax: 55440,
      grandTotal: 363440,
      status: 'Approved',
      riskScore: 20,
      riskLevel: 'LOW',
      approvalChainState: 'APPROVED'
    });


    // 6. SCENARIO 6: Rejected Request (TechNova - Silver Tier, Sales Rep B, Manager A)
    const req6 = await CustomerRequest.create({
      requestNumber: 'REQ-1006',
      customer: customerDocB._id,
      user: customerUserB._id,
      assignedSalesRep: salesRepB._id,
      items: [
        { product: products[0]._id, quantity: 20, desiredDiscountPercent: 35 }
      ],
      message: 'Unrealistic 35% discount request for laptop fleet.',
      status: 'Rejected_Manager',
      riskScore: 95,
      riskLevel: 'HIGH',
      riskReasons: ['Discount (35%) exceeds Silver limit (10%) by 25 points']
    });

    const quote6 = await Quotation.create({
      quoteNumber: 'Q-1006',
      customerRequest: req6._id,
      customer: customerDocB._id,
      salesRep: salesRepB._id,
      assignedSalesManager: salesManagerA._id,
      items: [
        { product: products[0]._id, quantity: 20, unitPrice: 85000, discountPercent: 35, finalUnitPrice: 55250, lineTotal: 1105000, allowedDiscountPercent: 10, approvalRequired: true, breachReason: 'Massive discount breach' }
      ],
      subtotal: 1105000,
      totalDiscount: 595000,
      tax: 198900,
      grandTotal: 1303900,
      status: 'Rejected',
      riskScore: 95,
      riskLevel: 'HIGH',
      approvalChainState: 'REJECTED'
    });

    await Approval.create({
      quotation: quote6._id,
      customerRequest: req6._id,
      customer: customerDocB._id,
      salesRep: salesRepB._id,
      salesManager: salesManagerA._id,
      requestedDiscount: 35,
      allowedDiscount: 10,
      currentStep: 'REJECTED',
      riskScore: 95,
      riskLevel: 'HIGH',
      managerApproval: {
        status: 'REJECTED',
        approvedBy: salesManagerA._id,
        approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        comment: 'Rejected: Discount request exceeds maximum margin threshold.'
      }
    });


    // 7. SCENARIO 7: Additional Closed Deal with SaaS Subscription (Urban Retail - Gold Tier, Sales Rep A)
    const req7 = await CustomerRequest.create({
      requestNumber: 'REQ-1007',
      customer: customerDocD._id,
      user: customerUserD._id,
      assignedSalesRep: salesRepA._id,
      items: [
        { product: products[3]._id, quantity: 2, desiredDiscountPercent: 10 }
      ],
      message: 'Subscription for 2 additional software branch licenses.',
      status: 'Closed',
      riskScore: 10,
      riskLevel: 'LOW'
    });

    const quote7 = await Quotation.create({
      quoteNumber: 'Q-1007',
      customerRequest: req7._id,
      customer: customerDocD._id,
      salesRep: salesRepA._id,
      assignedSalesManager: salesManagerA._id,
      items: [
        { product: products[3]._id, quantity: 2, unitPrice: 120000, discountPercent: 10, finalUnitPrice: 108000, lineTotal: 216000, allowedDiscountPercent: 20, approvalRequired: false }
      ],
      subtotal: 216000,
      totalDiscount: 24000,
      tax: 38880,
      grandTotal: 254880,
      status: 'Closed',
      riskScore: 10,
      riskLevel: 'LOW',
      approvalChainState: 'APPROVED',
      acceptedBy: customerUserD._id,
      acceptedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    });

    await finalizeClosedDeal({ quotationId: quote7._id, userId: salesRepA._id, userRole: 'SALES_REP' });

    console.log('Seeding Varied Subscriptions Ledger...');
    await Subscription.create([
      {
        subscriptionNumber: 'SUB-1001',
        customer: customerDocA._id,
        salesRep: salesRepA._id,
        quotation: quote1._id,
        product: products[3]._id,
        planName: 'DealFlow Enterprise SaaS License',
        billingCycle: 'Yearly',
        billingFrequency: 'ANNUALLY',
        amount: 114000,
        status: 'Active',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
        billingHistory: [
          { invoiceNumber: 'INV-1001', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), amount: 134520, status: 'PAID' }
        ]
      },
      {
        subscriptionNumber: 'SUB-1002',
        customer: customerDocB._id,
        salesRep: salesRepB._id,
        quotation: quote2._id,
        product: products[4]._id,
        planName: '24/7 Priority Cloud Support SLA',
        billingCycle: 'Monthly',
        billingFrequency: 'MONTHLY',
        amount: 50000,
        status: 'Active',
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        billingHistory: [
          { invoiceNumber: 'SUB-INV-2001', date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), amount: 59000, status: 'PAID' },
          { invoiceNumber: 'SUB-INV-2002', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), amount: 59000, status: 'PAID' },
          { invoiceNumber: 'SUB-INV-2003', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), amount: 59000, status: 'UNPAID' }
        ]
      },
      {
        subscriptionNumber: 'SUB-1003',
        customer: customerDocC._id,
        salesRep: salesRepC._id,
        quotation: quote3._id,
        product: products[5]._id,
        planName: 'Automated Threat Defense Suite',
        billingCycle: 'Quarterly',
        billingFrequency: 'QUARTERLY',
        amount: 75000,
        status: 'Paused',
        startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        billingHistory: [
          { invoiceNumber: 'SUB-INV-3001', date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), amount: 88500, status: 'PAID' }
        ]
      },
      {
        subscriptionNumber: 'SUB-1004',
        customer: customerDocD._id,
        salesRep: salesRepA._id,
        quotation: quote7._id,
        product: products[3]._id,
        planName: 'Retail POS Enterprise Software Suite',
        billingCycle: 'Yearly',
        billingFrequency: 'ANNUALLY',
        amount: 216000,
        status: 'Active',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 355 * 24 * 60 * 60 * 1000),
        billingHistory: [
          { invoiceNumber: 'SUB-INV-4001', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), amount: 254880, status: 'UNPAID' }
        ]
      },
      {
        subscriptionNumber: 'SUB-1005',
        customer: customerDocB._id,
        salesRep: salesRepB._id,
        product: products[4]._id,
        planName: 'Legacy Infrastructure Maintenance Agreement',
        billingCycle: 'Monthly',
        billingFrequency: 'MONTHLY',
        amount: 35000,
        status: 'Cancelled',
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        nextBillingDate: null,
        billingHistory: [
          { invoiceNumber: 'SUB-INV-5001', date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), amount: 41300, status: 'PAID' }
        ]
      }
    ]);

    console.log('=======================================================');
    console.log(' 🎉 DealFlow360 Demo Transactional Data & Real MongoDB  ');
    console.log('    Orders Successfully Generated Using Existing Users! ');
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
