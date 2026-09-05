const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

// Import Models
const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const CustomerRequest = require('../models/CustomerRequest');
const Quotation = require('../models/Quotation');
const Negotiation = require('../models/Negotiation');
const Approval = require('../models/Approval');
const Fulfillment = require('../models/Fulfillment');
const Backorder = require('../models/Backorder');
const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const DealHealth = require('../models/DealHealth');

dotenv.config();

const cleanTransactionalData = async () => {
  try {
    await connectDB();

    console.log('Connecting to MongoDB...');

    // Count user accounts before cleanup
    const userCount = await User.countDocuments();
    const customerCount = await Customer.countDocuments();
    const productCount = await Product.countDocuments();

    console.log(`\n=================================================`);
    console.log(` MASTER RECORDS (PRESERVED):`);
    console.log(` - Users: ${userCount}`);
    console.log(` - Customer Profiles: ${customerCount}`);
    console.log(` - Product Catalog: ${productCount}`);
    console.log(`=================================================\n`);

    console.log('Deleting all transactional & dummy business records...');

    const results = await Promise.all([
      CustomerRequest.deleteMany({}),
      Quotation.deleteMany({}),
      Negotiation.deleteMany({}),
      Approval.deleteMany({}),
      Fulfillment.deleteMany({}),
      Backorder.deleteMany({}),
      Invoice.deleteMany({}),
      Subscription.deleteMany({}),
      Message.deleteMany({}),
      Notification.deleteMany({}),
      DealHealth.deleteMany({})
    ]);

    console.log('\nTransactional Cleanup Summary:');
    console.log(` ✓ Product Requests deleted: ${results[0].deletedCount}`);
    console.log(` ✓ Quotations deleted: ${results[1].deletedCount}`);
    console.log(` ✓ Negotiations deleted: ${results[2].deletedCount}`);
    console.log(` ✓ Approvals deleted: ${results[3].deletedCount}`);
    console.log(` ✓ Fulfillments deleted: ${results[4].deletedCount}`);
    console.log(` ✓ Backorders deleted: ${results[5].deletedCount}`);
    console.log(` ✓ Invoices deleted: ${results[6].deletedCount}`);
    console.log(` ✓ Subscriptions deleted: ${results[7].deletedCount}`);
    console.log(` ✓ Messages deleted: ${results[8].deletedCount}`);
    console.log(` ✓ Notifications deleted: ${results[9].deletedCount}`);
    console.log(` ✓ DealHealth records deleted: ${results[10].deletedCount}`);

    // Verify Users & Customers remain 100% intact
    const finalUserCount = await User.countDocuments();
    const finalCustomerCount = await Customer.countDocuments();

    console.log(`\n=================================================`);
    console.log(` VERIFICATION:`);
    console.log(` ✓ User Accounts Intact: ${finalUserCount} / ${userCount}`);
    console.log(` ✓ Customer Accounts Intact: ${finalCustomerCount} / ${customerCount}`);
    console.log(`=================================================\n`);
    console.log('DATABASE CLEANUP COMPLETE: All transactional dummy data deleted successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error.message);
    process.exit(1);
  }
};

cleanTransactionalData();
