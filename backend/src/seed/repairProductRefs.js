const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

// Load models
const Product = require('../models/Product');
const CustomerRequest = require('../models/CustomerRequest');
const Quotation = require('../models/Quotation');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Negotiation = require('../models/Negotiation');
const Approval = require('../models/Approval');

dotenv.config();

async function checkAndRepairProductReferences() {
  await connectDB();
  console.log('--- Checking & Repairing Product References across all collections ---');

  const products = await Product.find();
  if (products.length === 0) {
    console.error('No products found in database!');
    process.exit(1);
  }

  const defaultProduct = products[0];
  console.log(`Default fallback product: [${defaultProduct._id}] ${defaultProduct.name} (${defaultProduct.sku})`);

  const validProductIds = new Set(products.map(p => p._id.toString()));

  // 1. Customer Requests
  const requests = await CustomerRequest.find();
  let reqRepaired = 0;
  for (const r of requests) {
    let modified = false;
    if (r.items && r.items.length > 0) {
      r.items.forEach(item => {
        if (!item.product || !validProductIds.has(item.product.toString())) {
          console.log(`Fixing Request ${r.requestNumber} item product from ${item.product} to ${defaultProduct._id}`);
          item.product = defaultProduct._id;
          modified = true;
        }
      });
    }
    if (modified) {
      await r.save();
      reqRepaired++;
    }
  }
  console.log(`Repaired ${reqRepaired} Customer Requests.`);

  // 2. Quotations
  const quotations = await Quotation.find();
  let qRepaired = 0;
  for (const q of quotations) {
    let modified = false;
    if (q.items && q.items.length > 0) {
      q.items.forEach(item => {
        if (!item.product || !validProductIds.has(item.product.toString())) {
          console.log(`Fixing Quotation ${q.quoteNumber} item product from ${item.product} to ${defaultProduct._id}`);
          item.product = defaultProduct._id;
          modified = true;
        }
      });
    }
    if (modified) {
      await q.save();
      qRepaired++;
    }
  }
  console.log(`Repaired ${qRepaired} Quotations.`);

  // 3. Orders
  const orders = await Order.find();
  let ordRepaired = 0;
  for (const o of orders) {
    let modified = false;
    if (o.items && o.items.length > 0) {
      o.items.forEach(item => {
        if (!item.product || !validProductIds.has(item.product.toString())) {
          console.log(`Fixing Order ${o.orderNumber} item product from ${item.product} to ${defaultProduct._id}`);
          item.product = defaultProduct._id;
          modified = true;
        }
      });
    }
    if (modified) {
      await o.save();
      ordRepaired++;
    }
  }
  console.log(`Repaired ${ordRepaired} Orders.`);

  console.log('--- Repair Complete ---');
  process.exit(0);
}

checkAndRepairProductReferences().catch(err => {
  console.error(err);
  process.exit(1);
});
