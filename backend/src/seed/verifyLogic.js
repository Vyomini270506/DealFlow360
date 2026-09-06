const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const CustomerRequest = require('../models/CustomerRequest');
const Quotation = require('../models/Quotation');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const AuditLog = require('../models/AuditLog');

const { generateQuotationFromApprovedRequest } = require('../services/quotationGenerator');
const { finalizeClosedDeal } = require('../services/dealClosureService');

const verify = async () => {
  try {
    await connectDB();
    console.log('--- STARTING VERIFICATION OF DEAL CLOSURE LOGIC ---');

    const customer = await Customer.findOne();
    const rep = await User.findOne({ role: 'SALES_REP' });
    const product = await Product.findOne({ category: 'Hardware' });

    if (!customer || !rep || !product) {
      console.error('Missing prerequisite test models');
      process.exit(1);
    }

    // 1. Create a Customer Request
    const requestNumber = `PR-VERIFY-${Date.now()}`;
    const reqDoc = await CustomerRequest.create({
      requestNumber,
      customer: customer._id,
      user: rep._id,
      assignedSalesRep: rep._id,
      items: [{ product: product._id, quantity: 2, desiredDiscountPercent: 5 }],
      status: 'Pending',
      riskScore: 5,
      riskLevel: 'LOW'
    });
    console.log(`✓ 1. Customer Request ${reqDoc.requestNumber} created.`);

    // 2. Seller approves request -> Quotation generated
    const quoteDoc = await generateQuotationFromApprovedRequest({
      customerRequest: reqDoc,
      approvedByUserId: rep._id,
      userRole: 'SALES_REP'
    });

    console.log(`✓ 2. Quotation ${quoteDoc.quoteNumber} generated.`);
    console.log(`   - sellerAgreed: ${quoteDoc.sellerAgreed} (EXPECTED: true)`);
    console.log(`   - customerAgreed: ${quoteDoc.customerAgreed} (EXPECTED: false)`);
    console.log(`   - status: ${quoteDoc.status} (EXPECTED: Approved)`);

    if (!quoteDoc.sellerAgreed || quoteDoc.customerAgreed || quoteDoc.status !== 'Approved') {
      throw new Error('FAILED Step 2 seller agreement state verification');
    }

    // Check Invoice NOT generated before deal closure
    const preInvoice = await Invoice.findOne({ quotation: quoteDoc._id });
    console.log(`✓ 3. Pre-closure invoice check: invoice is ${preInvoice ? 'EXISTS (FAIL)' : 'NULL (EXPECTED)'}`);
    if (preInvoice) {
      throw new Error('FAILED Step 3 Absolute Invoice Rule: Invoice must NOT be generated before deal closure');
    }

    // 4. Customer accepts quotation
    const prevStatus = quoteDoc.status;
    quoteDoc.customerAgreed = true;
    quoteDoc.customerConfirmed = true;
    quoteDoc.acceptedBy = customer._id;
    quoteDoc.acceptedAt = new Date();
    await quoteDoc.save();

    const closureResult = await finalizeClosedDeal({
      quotationId: quoteDoc._id,
      userId: customer._id,
      userRole: 'CUSTOMER'
    });

    console.log(`✓ 4. Customer accepted quotation -> Both parties agreed!`);
    console.log(`   - Closed status: ${closureResult.quotation.status} (EXPECTED: Closed)`);
    console.log(`   - Order created: ${closureResult.order ? closureResult.order.orderNumber : 'NONE'} (EXPECTED: ORD-...)`);
    console.log(`   - Invoice created: ${closureResult.invoice ? closureResult.invoice.invoiceNumber : 'NONE'} (EXPECTED: INV-...)`);

    if (closureResult.quotation.status !== 'Closed' || !closureResult.order || !closureResult.invoice) {
      throw new Error('FAILED Step 4 Deal Closure & Post-Closure Billing generation');
    }

    // 5. Verify audit logs
    const auditLogs = await AuditLog.find({ recordId: quoteDoc._id });
    console.log(`✓ 5. Audit logs recorded: ${auditLogs.length} events found.`);
    const actions = auditLogs.map(l => l.action);
    console.log(`   - Actions logged: ${actions.join(', ')}`);

    if (!actions.includes('SELLER_AGREED') || !actions.includes('BOTH_PARTIES_AGREED') || !actions.includes('DEAL_CLOSED')) {
      throw new Error('FAILED Step 5 Audit Log verification');
    }

    console.log('🎉 ALL BUSINESS LOGIC VERIFICATION CHECKS PASSED PERFECTLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
};

verify();
