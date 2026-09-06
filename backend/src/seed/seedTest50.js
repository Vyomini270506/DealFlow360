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
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Negotiation = require('../models/Negotiation');
const CustomerRequest = require('../models/CustomerRequest');
const DealHealth = require('../models/DealHealth');

// Services
const { calculateBlendedDiscountRisk } = require('../services/riskEngine');
const { finalizeClosedDeal } = require('../services/dealClosureService');
const { logAudit } = require('../services/auditService');

dotenv.config();

const seedTest50 = async () => {
  try {
    await connectDB();
    console.log('🔄 Checking existing 50-Record Test Dataset in MongoDB...');

    // 1. Idempotency Check
    const existingTestRequests = await CustomerRequest.countDocuments({ requestNumber: /^PR-5/ });
    if (existingTestRequests >= 50) {
      console.log(`✅ ${existingTestRequests} 50-Series Test Records already exist in MongoDB. Skipping seed to prevent duplicates.`);
      process.exit(0);
      return;
    } else if (existingTestRequests > 0) {
      console.log(`🧹 Cleaning incomplete 50-Series test records (${existingTestRequests} found)...`);
      const testReqs = await CustomerRequest.find({ requestNumber: /^PR-5/ }).select('_id');
      const reqIds = testReqs.map(r => r._id);
      const testQuotes = await Quotation.find({ quoteNumber: /^Q-5/ }).select('_id');
      const quoteIds = testQuotes.map(q => q._id);

      await CustomerRequest.deleteMany({ requestNumber: /^PR-5/ });
      await Quotation.deleteMany({ quoteNumber: /^Q-5/ });
      await Approval.deleteMany({ quotation: { $in: quoteIds } });
      await Negotiation.deleteMany({ customerRequest: { $in: reqIds } });
      await Invoice.deleteMany({ quotation: { $in: quoteIds } });
      await Subscription.deleteMany({ quotation: { $in: quoteIds } });
      await DealHealth.deleteMany({ quotation: { $in: quoteIds } });
    }

    console.log('🚀 Seeding 50 Interconnected Real MongoDB Test Records...');

    // 2. Base Setup — Discount Tiers & Category Limits
    const tierData = [
      { tier: 'Iron', maxDiscountPercentage: 3 },
      { tier: 'Bronze', maxDiscountPercentage: 5 },
      { tier: 'Silver', maxDiscountPercentage: 10 },
      { tier: 'Gold', maxDiscountPercentage: 15 }
    ];
    for (const t of tierData) {
      await DiscountTier.findOneAndUpdate({ tier: t.tier }, t, { upsert: true, new: true });
    }

    const catData = [
      { category: 'Hardware', maxDiscountPercentage: 15 },
      { category: 'Services', maxDiscountPercentage: 10 },
      { category: 'Software', maxDiscountPercentage: 20 }
    ];
    for (const c of catData) {
      await CategoryLimit.findOneAndUpdate({ category: c.category }, c, { upsert: true, new: true });
    }

    // 3. Subscription Plans
    const planCare = await SubscriptionPlan.findOneAndUpdate(
      { name: '24/7 Care Support Plan' },
      {
        name: '24/7 Care Support Plan',
        billingFrequency: 'Monthly',
        price: 5000,
        description: '24/7 dedicated enterprise technical support'
      },
      { upsert: true, new: true }
    );

    const planCloud = await SubscriptionPlan.findOneAndUpdate(
      { name: 'Cloud Infrastructure Plan' },
      {
        name: 'Cloud Infrastructure Plan',
        billingFrequency: 'Yearly',
        price: 120000,
        description: 'Managed enterprise cloud migration and scaling'
      },
      { upsert: true, new: true }
    );

    // 4. Products
    const prodLaptop = await Product.findOneAndUpdate(
      { sku: 'HW-LAP-501' },
      {
        sku: 'HW-LAP-501',
        name: 'Business Laptop Pro 15',
        category: 'Hardware',
        type: 'ONE_TIME',
        unitPrice: 65000,
        maxDiscountPercentage: 15,
        marginPercentage: 25,
        description: 'High performance enterprise business laptop'
      },
      { upsert: true, new: true }
    );

    const prodServer = await Product.findOneAndUpdate(
      { sku: 'HW-SRV-502' },
      {
        sku: 'HW-SRV-502',
        name: 'Enterprise Server Rack X',
        category: 'Hardware',
        type: 'ONE_TIME',
        unitPrice: 250000,
        maxDiscountPercentage: 15,
        marginPercentage: 30,
        description: 'High capacity rack-mounted datacenter server'
      },
      { upsert: true, new: true }
    );

    const prodMonitor = await Product.findOneAndUpdate(
      { sku: 'HW-MON-503' },
      {
        sku: 'HW-MON-503',
        name: '4K Ultra Display Monitor 32"',
        category: 'Hardware',
        type: 'ONE_TIME',
        unitPrice: 35000,
        maxDiscountPercentage: 15,
        marginPercentage: 20,
        description: 'Professional UHD color-calibrated display monitor'
      },
      { upsert: true, new: true }
    );

    const prodSupport = await Product.findOneAndUpdate(
      { sku: 'SV-CARE-504' },
      {
        sku: 'SV-CARE-504',
        name: '24/7 Premium Care Support',
        category: 'Services',
        type: 'RECURRING',
        billingFrequency: 'Monthly',
        unitPrice: 5000,
        maxDiscountPercentage: 10,
        marginPercentage: 45,
        description: 'Round-the-clock priority technical escalation SLA'
      },
      { upsert: true, new: true }
    );

    const prodCloudService = await Product.findOneAndUpdate(
      { sku: 'SV-MIG-505' },
      {
        sku: 'SV-MIG-505',
        name: 'Enterprise Security Suite',
        category: 'Software',
        type: 'RECURRING',
        billingFrequency: 'Yearly',
        unitPrice: 40000,
        maxDiscountPercentage: 20,
        marginPercentage: 50,
        description: 'Full-spectrum network & endpoint security software'
      },
      { upsert: true, new: true }
    );

    // 5. Warehouses & Inventory
    const whDelhi = await Warehouse.findOneAndUpdate(
      { name: 'North Central Hub (Delhi)' },
      { name: 'North Central Hub (Delhi)', location: 'New Delhi, DL', capacity: 1000 },
      { upsert: true, new: true }
    );

    const whBlr = await Warehouse.findOneAndUpdate(
      { name: 'South Tech Warehouse (Bengaluru)' },
      { name: 'South Tech Warehouse (Bengaluru)', location: 'Bengaluru, KA', capacity: 800 },
      { upsert: true, new: true }
    );

    const whMum = await Warehouse.findOneAndUpdate(
      { name: 'West Maritime Logistics (Mumbai)' },
      { name: 'West Maritime Logistics (Mumbai)', location: 'Mumbai, MH', capacity: 600 },
      { upsert: true, new: true }
    );

    // Seed stock quantities
    const stockItems = [
      { warehouse: whDelhi._id, product: prodLaptop._id, stockQuantity: 20, reservedQuantity: 0 },
      { warehouse: whBlr._id, product: prodLaptop._id, stockQuantity: 15, reservedQuantity: 0 },
      { warehouse: whMum._id, product: prodLaptop._id, stockQuantity: 10, reservedQuantity: 0 },
      { warehouse: whDelhi._id, product: prodServer._id, stockQuantity: 5, reservedQuantity: 0 },
      { warehouse: whBlr._id, product: prodServer._id, stockQuantity: 8, reservedQuantity: 0 },
      { warehouse: whDelhi._id, product: prodMonitor._id, stockQuantity: 30, reservedQuantity: 0 }
    ];

    for (const inv of stockItems) {
      await Inventory.findOneAndUpdate(
        { warehouse: inv.warehouse, product: inv.product },
        inv,
        { upsert: true, new: true }
      );
    }

    // 6. Users (Manager & Sales Reps)
    let salesManager = await User.findOne({ email: 'manager.alpha@dealflow360.com' });
    if (!salesManager) {
      salesManager = await User.create({
        name: 'Sales Manager Alpha',
        email: 'manager.alpha@dealflow360.com',
        password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456', // hashed mock
        role: 'SALES_MANAGER'
      });
    }

    let salesRepA = await User.findOne({ email: 'rep.apex@dealflow360.com' });
    if (!salesRepA) {
      salesRepA = await User.create({
        name: 'Sales Rep Apex',
        email: 'rep.apex@dealflow360.com',
        password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
        role: 'SALES_REP',
        salesManagerId: salesManager._id
      });
    }

    let salesRepB = await User.findOne({ email: 'rep.beacon@dealflow360.com' });
    if (!salesRepB) {
      salesRepB = await User.create({
        name: 'Sales Rep Beacon',
        email: 'rep.beacon@dealflow360.com',
        password: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
        role: 'SALES_REP',
        salesManagerId: salesManager._id
      });
    }

    // 7. Customers (Bronze, Silver, Gold)
    const customerList = [
      { name: 'Aero Dynamics Corp', company: 'Aero Dynamics', email: 'procurement@aerodynamics.com', tier: 'Gold' },
      { name: 'Apex Tech Solutions', company: 'Apex Tech', email: 'orders@apextech.com', tier: 'Silver' },
      { name: 'Bronze Logistics Inc', company: 'Bronze Logistics', email: 'buy@bronzelogistics.com', tier: 'Bronze' },
      { name: 'Crestfield Systems', company: 'Crestfield', email: 'b2b@crestfield.com', tier: 'Gold' },
      { name: 'Delta Cybernetics', company: 'Delta Cybernetics', email: 'supply@deltacyber.com', tier: 'Silver' },
      { name: 'Echo Hardware Works', company: 'Echo Works', email: 'procure@echoworks.com', tier: 'Bronze' },
      { name: 'Frontier Network Inc', company: 'Frontier Net', email: 'info@frontiernet.com', tier: 'Gold' },
      { name: 'Global Zenith Corp', company: 'Global Zenith', email: 'deals@globalzenith.com', tier: 'Silver' },
      { name: 'Horizon Cloud Labs', company: 'Horizon Labs', email: 'purchasing@horizonlabs.com', tier: 'Gold' },
      { name: 'Impulse Retail Solutions', company: 'Impulse Retail', email: 'contact@impulse.com', tier: 'Bronze' }
    ];

    const seededCustomers = [];
    for (const c of customerList) {
      const rep = seededCustomers.length % 2 === 0 ? salesRepA : salesRepB;
      let cust = await Customer.findOne({ email: c.email });
      if (!cust) {
        cust = await Customer.create({
          ...c,
          assignedSalesRepresentative: rep._id,
          assignedSalesManager: salesManager._id,
          assignmentStatus: 'REP_ASSIGNED'
        });
      }
      seededCustomers.push(cust);
    }

    // 8. Generate 50 Customer Requests, Quotations, Approvals, Negotiations, Invoices, Subscriptions & Payments
    console.log('📦 Creating 50 Interconnected Customer Requests & Quotation Pipelines...');

    let createdRequestsCount = 0;
    let createdQuotationsCount = 0;
    let createdApprovalsCount = 0;
    let createdNegotiationsCount = 0;
    let createdInvoicesCount = 0;
    let createdSubscriptionsCount = 0;
    let createdPaymentsCount = 0;
    let createdDealHealthCount = 0;

    const requestStatuses = [
      'Pending', 'Submitted', 'Processing', 'Negotiation_Required',
      'Approved_Manager', 'Rejected_Manager', 'WITHDRAWN', 'Closed'
    ];

    const productsPool = [
      { prod: prodLaptop, defaultDisc: 5 },
      { prod: prodServer, defaultDisc: 18 },
      { prod: prodMonitor, defaultDisc: 10 },
      { prod: prodSupport, defaultDisc: 12 },
      { prod: prodCloudService, defaultDisc: 8 }
    ];

    for (let i = 1; i <= 50; i++) {
      const requestNumber = `PR-${5000 + i}`;
      const quoteNumber = `Q-${5000 + i}`;
      const customer = seededCustomers[(i - 1) % seededCustomers.length];
      const assignedRep = (i % 2 === 0) ? salesRepA : salesRepB;

      const statusIndex = (i - 1) % requestStatuses.length;
      const status = requestStatuses[statusIndex];

      // Pick items for this request
      const item1 = productsPool[(i) % productsPool.length];
      const item2 = productsPool[(i + 2) % productsPool.length];

      // Set specific discount given to test blended risk calculation
      let givenDisc1 = item1.defaultDisc;
      let givenDisc2 = item2.defaultDisc;

      if (i % 3 === 0) {
        // High Risk case
        givenDisc1 = 22; // 22% given > 15% allowed -> excess = 7
        givenDisc2 = 18; // 18% given > 10% allowed -> excess = 8 -> Total risk = 15 (HIGH)
      } else if (i % 2 === 0) {
        // Medium Risk case
        givenDisc1 = 17; // 17% given > 15% allowed -> excess = 2 (MEDIUM)
        givenDisc2 = 10;
      } else {
        // Low Risk case
        givenDisc1 = 5; // within limit -> excess = 0 (LOW)
        givenDisc2 = 5;
      }

      const reqItems = [
        { product: item1.prod._id, quantity: (i % 5) + 1, desiredDiscountPercent: givenDisc1 },
        { product: item2.prod._id, quantity: (i % 3) + 1, desiredDiscountPercent: givenDisc2 }
      ];

      // Calculate risk via single source of truth risk engine
      const riskAnalysis = await calculateBlendedDiscountRisk({
        items: reqItems,
        customerId: customer._id
      });

      // Create CustomerRequest document
      const customerReq = await CustomerRequest.create({
        requestNumber,
        customer: customer._id,
        user: assignedRep._id,
        assignedSalesRep: assignedRep._id,
        items: reqItems,
        message: `B2B Procurement demand batch #${i} for ${customer.company}`,
        status: status === 'Closed' ? 'Closed' : (status === 'Approved_Manager' ? 'Quoted' : status),
        riskScore: riskAnalysis.riskScore,
        riskLevel: riskAnalysis.riskLevel,
        approvalRequired: riskAnalysis.managerApprovalRequired,
        managerApprovalRequired: riskAnalysis.managerApprovalRequired,
        financeReviewRequired: riskAnalysis.financeReviewRequired,
        riskFactors: riskAnalysis.riskFactors,
        riskReasons: riskAnalysis.riskReasons,
        createdAt: new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000)
      });
      createdRequestsCount++;

      // Create Quotation line items
      const quoteItems = [
        {
          product: item1.prod._id,
          quantity: reqItems[0].quantity,
          unitPrice: item1.prod.unitPrice,
          discountPercent: givenDisc1,
          finalUnitPrice: Number((item1.prod.unitPrice * (1 - givenDisc1 / 100)).toFixed(2)),
          lineTotal: Number((item1.prod.unitPrice * (1 - givenDisc1 / 100) * reqItems[0].quantity).toFixed(2))
        },
        {
          product: item2.prod._id,
          quantity: reqItems[1].quantity,
          unitPrice: item2.prod.unitPrice,
          discountPercent: givenDisc2,
          finalUnitPrice: Number((item2.prod.unitPrice * (1 - givenDisc2 / 100)).toFixed(2)),
          lineTotal: Number((item2.prod.unitPrice * (1 - givenDisc2 / 100) * reqItems[1].quantity).toFixed(2))
        }
      ];

      let subtotalVal = quoteItems[0].lineTotal + quoteItems[1].lineTotal;
      let taxVal = Number((subtotalVal * 0.18).toFixed(2));
      let grandTotalVal = Number((subtotalVal + taxVal).toFixed(2));

      let quoteStatus = 'Draft';
      if (status === 'Closed') quoteStatus = 'Closed';
      else if (status === 'Approved_Manager') quoteStatus = 'Approved';
      else if (status === 'Negotiation_Required') quoteStatus = 'Negotiation';
      else if (status === 'Rejected_Manager') quoteStatus = 'Rejected';
      else if (status === 'Withdrawn') quoteStatus = 'DISCARDED';
      else quoteStatus = 'Pending Approval';

      const quotationDoc = await Quotation.create({
        quoteNumber,
        customerRequest: customerReq._id,
        customer: customer._id,
        salesRep: assignedRep._id,
        assignedSalesManager: salesManager._id,
        items: quoteItems,
        subtotal: subtotalVal,
        tax: taxVal,
        grandTotal: grandTotalVal,
        estimatedMarginPercent: 25,
        riskScore: riskAnalysis.riskScore,
        riskLevel: riskAnalysis.riskLevel,
        approvalRequired: riskAnalysis.managerApprovalRequired,
        managerApprovalRequired: riskAnalysis.managerApprovalRequired,
        financeReviewRequired: riskAnalysis.financeReviewRequired,
        approvalChainState: riskAnalysis.managerApprovalRequired ? (status === 'Approved_Manager' ? 'APPROVED' : 'SALES_MANAGER') : 'NONE',
        riskFactors: riskAnalysis.riskFactors,
        riskReasons: riskAnalysis.riskReasons,
        status: quoteStatus,
        createdAt: new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000)
      });
      createdQuotationsCount++;

      // Create Approval Record if Medium or High risk
      if (riskAnalysis.managerApprovalRequired) {
        let step = 'SALES_MANAGER';
        let mgrStatus = 'PENDING';
        let finStatus = riskAnalysis.riskLevel === 'HIGH' ? 'PENDING' : 'NOT_REQUIRED';

        if (status === 'Approved_Manager' || status === 'Closed') {
          step = 'COMPLETED';
          mgrStatus = 'APPROVED';
          if (riskAnalysis.riskLevel === 'HIGH') finStatus = 'APPROVED';
        } else if (status === 'Rejected_Manager') {
          step = 'REJECTED';
          mgrStatus = 'REJECTED';
        } else if (riskAnalysis.riskLevel === 'HIGH') {
          step = 'FINANCE_OPERATIONS';
        }

        await Approval.create({
          quotation: quotationDoc._id,
          customerRequest: customerReq._id,
          salesRep: assignedRep._id,
          assignedSalesManager: salesManager._id,
          customer: customer._id,
          currentStep: step,
          riskScore: riskAnalysis.riskScore,
          riskLevel: riskAnalysis.riskLevel,
          riskReasons: riskAnalysis.riskReasons,
          requestedDiscount: givenDisc1,
          allowedDiscount: 15,
          managerApproval: {
            status: mgrStatus,
            approvedBy: salesManager._id,
            comment: 'Approved by Sales Manager after risk evaluation'
          },
          financeApproval: {
            status: finStatus,
            comment: riskAnalysis.riskLevel === 'HIGH' ? 'Finance review opinion provided.' : ''
          }
        });
        createdApprovalsCount++;
      }

      // Create Negotiation thread for negotiation cases
      if (status === 'Negotiation_Required' || status === 'Closed') {
        let negStatus = status === 'Closed' ? 'Closed' : 'Active';
        await Negotiation.create({
          quotation: quotationDoc._id,
          customerRequest: customerReq._id,
          customer: customer._id,
          salesRep: assignedRep._id,
          salesManager: salesManager._id,
          status: negStatus,
          customerConfirmation: { status: status === 'Closed' ? 'CONFIRMED' : 'PENDING', confirmedAt: new Date() },
          salesRepConfirmation: { status: status === 'Closed' ? 'CONFIRMED' : 'PENDING', confirmedAt: new Date() },
          messages: [
            {
              sender: customer._id,
              senderRole: 'CUSTOMER',
              message: `Requested counter-offer discount of ${givenDisc1}% on item 1 for bulk volume.`,
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
              sender: assignedRep._id,
              senderRole: 'SALES_REP',
              message: `Sales Rep counter-proposal: Offered ${givenDisc1}% subject to manager approval.`,
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
          ]
        });
        createdNegotiationsCount++;
      }

      // If status is Closed: Execute automated post-closure pipeline (Invoice, Subscriptions, Fulfillment, Payments)
      if (status === 'Closed') {
        const closureResult = await finalizeClosedDeal({
          quotationId: quotationDoc._id,
          userId: assignedRep._id,
          userRole: 'SALES_REP'
        });

        if (closureResult.invoice) {
          createdInvoicesCount++;
          // Record payment status distribution across test deals
          if (i % 3 === 0) {
            // PAID
            const inv = await Invoice.findById(closureResult.invoice._id);
            inv.amountPaid = inv.grandTotal;
            inv.paymentStatus = 'PAID';
            await inv.save();
            createdPaymentsCount++;
          } else if (i % 2 === 0) {
            // PARTIALLY_PAID
            const inv = await Invoice.findById(closureResult.invoice._id);
            inv.amountPaid = Number((inv.grandTotal * 0.5).toFixed(2));
            inv.paymentStatus = 'PARTIALLY_PAID';
            await inv.save();
            createdPaymentsCount++;
          }
        }

        if (closureResult.subscriptions && closureResult.subscriptions.length > 0) {
          createdSubscriptionsCount += closureResult.subscriptions.length;
        }
      }

      // Create DealHealth Record
      const healthScore = Math.max(20, 100 - riskAnalysis.riskScore * 3);
      const alerts = [];
      if (riskAnalysis.riskScore > 5) {
        alerts.push({
          type: 'DISCOUNT_ANOMALY',
          severity: 'HIGH',
          message: `Excess discount breach of ${riskAnalysis.riskScore}% above tier limit`,
          whyItMatters: 'Impacts gross profit margin ceiling',
          recommendedAction: 'Requires Finance review and Manager signoff'
        });
      }
      if (status === 'Negotiation_Required') {
        alerts.push({
          type: 'CUSTOMER_NEGOTIATION',
          severity: 'MEDIUM',
          message: 'Negotiation thread open for > 48 hours',
          whyItMatters: 'Risk of deal slippage to competitor',
          recommendedAction: 'Sales Rep should submit counter-offer'
        });
      }

      await DealHealth.create({
        quotation: quotationDoc._id,
        customer: customer._id,
        salesRep: assignedRep._id,
        dealValue: grandTotalVal,
        healthScore,
        riskScore: riskAnalysis.riskScore,
        alerts
      });
      createdDealHealthCount++;
    }

    console.log('\n================================================================');
    console.log(' 🎉 DealFlow360 50-Record Test Dataset Successfully Generated! 🎉');
    console.log('================================================================');
    console.table({
      'Discount Tiers': tierData.length,
      'Category Limits': catData.length,
      'Products': 5,
      'Warehouses': 3,
      'Customers': customerList.length,
      'Customer Requests (50-Series)': createdRequestsCount,
      'Quotations': createdQuotationsCount,
      'Approvals': createdApprovalsCount,
      'Negotiations': createdNegotiationsCount,
      'Invoices': createdInvoicesCount,
      'Subscriptions': createdSubscriptionsCount,
      'Payments Recorded': createdPaymentsCount,
      'Deal Health Records': createdDealHealthCount
    });
    console.log('================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error executing 50-record seed script:', error);
    process.exit(1);
  }
};

seedTest50();
