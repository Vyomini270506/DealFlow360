const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

// Load models in exact dependency order
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const User = require('../models/User');
const CustomerRequest = require('../models/CustomerRequest');
const Quotation = require('../models/Quotation');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Negotiation = require('../models/Negotiation');

dotenv.config();

async function inspectMissingValues() {
  await connectDB();
  console.log('--- Inspecting Database for Missing Product References & Values ---');

  const products = await Product.find();
  console.log(`Total Products in DB: ${products.length}`);

  // 1. Customer Requests
  const requests = await CustomerRequest.find().populate('items.product');
  console.log(`\nInspecting ${requests.length} Customer Requests...`);
  let reqMissingCount = 0;
  requests.forEach(r => {
    if (!r.items || r.items.length === 0) {
      console.log(`❌ Request ${r.requestNumber} has NO items!`);
      reqMissingCount++;
    } else {
      r.items.forEach((item, idx) => {
        if (!item.product) {
          console.log(`❌ Request ${r.requestNumber} item #${idx} has NULL product!`);
          reqMissingCount++;
        } else if (!item.product.name) {
          console.log(`⚠️ Request ${r.requestNumber} item #${idx} product has NO name:`, item.product);
          reqMissingCount++;
        }
      });
    }
  });

  // 2. Quotations
  const quotations = await Quotation.find().populate('items.product');
  console.log(`\nInspecting ${quotations.length} Quotations...`);
  let qMissingCount = 0;
  quotations.forEach(q => {
    if (!q.items || q.items.length === 0) {
      console.log(`❌ Quotation ${q.quoteNumber} has NO items!`);
      qMissingCount++;
    } else {
      q.items.forEach((item, idx) => {
        if (!item.product) {
          console.log(`❌ Quotation ${q.quoteNumber} item #${idx} has NULL product!`);
          qMissingCount++;
        } else if (!item.product.name) {
          console.log(`⚠️ Quotation ${q.quoteNumber} item #${idx} product has NO name:`, item.product);
          qMissingCount++;
        }
      });
    }
  });

  // 3. Orders
  const orders = await Order.find().populate('items.product');
  console.log(`\nInspecting ${orders.length} Orders...`);
  let ordMissingCount = 0;
  orders.forEach(o => {
    if (!o.items || o.items.length === 0) {
      console.log(`❌ Order ${o.orderNumber} has NO items!`);
      ordMissingCount++;
    } else {
      o.items.forEach((item, idx) => {
        if (!item.product) {
          console.log(`❌ Order ${o.orderNumber} item #${idx} has NULL product!`);
          ordMissingCount++;
        }
      });
    }
  });

  // 4. Negotiations
  const negotiations = await Negotiation.find()
    .populate({ path: 'quotation', populate: { path: 'items.product' } })
    .populate({ path: 'customerRequest', populate: { path: 'items.product' } });
  console.log(`\nInspecting ${negotiations.length} Negotiations...`);
  let negMissingCount = 0;
  negotiations.forEach(n => {
    const qItems = n.quotation?.items || [];
    const rItems = n.customerRequest?.items || [];
    if (qItems.length === 0 && rItems.length === 0) {
      console.log(`⚠️ Negotiation ${n._id} has NO items in quotation or request!`);
      negMissingCount++;
    }
  });

  console.log('\n--- Summary ---');
  console.log(`CustomerRequests with missing product values: ${reqMissingCount}`);
  console.log(`Quotations with missing product values: ${qMissingCount}`);
  console.log(`Orders with missing product values: ${ordMissingCount}`);
  console.log(`Negotiations with missing product values: ${negMissingCount}`);

  process.exit(0);
}

inspectMissingValues().catch(err => {
  console.error(err);
  process.exit(1);
});
