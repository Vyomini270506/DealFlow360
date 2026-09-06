const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const Order = require('../backend/src/models/Order');
const CustomerRequest = require('../backend/src/models/CustomerRequest');
const Quotation = require('../backend/src/models/Quotation');
const Approval = require('../backend/src/models/Approval');
const Negotiation = require('../backend/src/models/Negotiation');
const Invoice = require('../backend/src/models/Invoice');
const Fulfillment = require('../backend/src/models/Fulfillment');
const Backorder = require('../backend/src/models/Backorder');
const Subscription = require('../backend/src/models/Subscription');

async function testQuery() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dealflow360');
    console.log('Connected to MongoDB');

    const orders = await Order.find()
      .populate('customer', 'name company email')
      .populate('salesRep', 'name email role')
      .populate('quotation', 'quoteNumber grandTotal')
      .populate('invoice', 'invoiceNumber paymentStatus')
      .populate('fulfillment', 'status');

    console.log(`\n=== REAL MONGODB ORDERS COUNT: ${orders.length} ===`);
    orders.forEach((o, i) => {
      console.log(`\nOrder #${i+1}: ${o.orderNumber}`);
      console.log(`  Customer: ${o.customer?.company || o.customer?.name}`);
      console.log(`  Sales Rep: ${o.salesRep?.name}`);
      console.log(`  Status: ${o.orderStatus}`);
      console.log(`  Grand Total: ₹${o.grandTotal}`);
      console.log(`  Linked Invoice: ${o.invoice?.invoiceNumber} (${o.invoice?.paymentStatus})`);
      console.log(`  Linked Fulfillment: ${o.fulfillment?.status || 'N/A'}`);
      console.log(`  Items Count: ${o.items?.length}`);
    });

    const reqs = await CustomerRequest.countDocuments();
    const quotes = await Quotation.countDocuments();
    const approvals = await Approval.countDocuments();
    const negs = await Negotiation.countDocuments();
    const invoices = await Invoice.countDocuments();
    const fulfillments = await Fulfillment.countDocuments();
    const backorders = await Backorder.countDocuments();
    const subscriptions = await Subscription.countDocuments();

    console.log('\n=== REAL MONGODB TRANSACTIONAL RECORD COUNTS ===');
    console.log(`Customer Requests: ${reqs}`);
    console.log(`Quotations: ${quotes}`);
    console.log(`Approvals: ${approvals}`);
    console.log(`Negotiations: ${negs}`);
    console.log(`Orders: ${orders.length}`);
    console.log(`Invoices: ${invoices}`);
    console.log(`Fulfillments: ${fulfillments}`);
    console.log(`Backorders: ${backorders}`);
    console.log(`Subscriptions: ${subscriptions}`);

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error querying MongoDB:', err);
    process.exit(1);
  }
}

testQuery();
