const path = require('path');
const backendPath = (mod) => path.join(__dirname, '../backend/node_modules', mod);

const mongoose = require(backendPath('mongoose'));
require(backendPath('dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

// Import Models
const User = require('../backend/src/models/User');
const Customer = require('../backend/src/models/Customer');
const Product = require('../backend/src/models/Product');
const CustomerRequest = require('../backend/src/models/CustomerRequest');
const Quotation = require('../backend/src/models/Quotation');
const Negotiation = require('../backend/src/models/Negotiation');
const Approval = require('../backend/src/models/Approval');
const Fulfillment = require('../backend/src/models/Fulfillment');
const Backorder = require('../backend/src/models/Backorder');
const Invoice = require('../backend/src/models/Invoice');
const Subscription = require('../backend/src/models/Subscription');
const Message = require('../backend/src/models/Message');
const Notification = require('../backend/src/models/Notification');
const DealHealth = require('../backend/src/models/DealHealth');

async function cleanDatabase() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dealflow360');
  console.log('Connected to MongoDB');

  const userCount = await User.countDocuments();
  const customerCount = await Customer.countDocuments();
  const productCount = await Product.countDocuments();

  console.log(`Preserved Master Records - Users: ${userCount}, Customers: ${customerCount}, Products: ${productCount}`);
  console.log('Wiping all transaction collections...');

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

  console.log('CLEANUP SUCCESSFUL:');
  console.log(`- Customer Requests deleted: ${results[0].deletedCount}`);
  console.log(`- Quotations deleted: ${results[1].deletedCount}`);
  console.log(`- Negotiations deleted: ${results[2].deletedCount}`);
  console.log(`- Approvals deleted: ${results[3].deletedCount}`);
  console.log(`- Fulfillments deleted: ${results[4].deletedCount}`);
  console.log(`- Backorders deleted: ${results[5].deletedCount}`);
  console.log(`- Invoices deleted: ${results[6].deletedCount}`);
  console.log(`- Subscriptions deleted: ${results[7].deletedCount}`);
  console.log(`- Messages deleted: ${results[8].deletedCount}`);
  console.log(`- Notifications deleted: ${results[9].deletedCount}`);
  console.log(`- DealHealth deleted: ${results[10].deletedCount}`);

  await mongoose.disconnect();
}

cleanDatabase().catch(console.error);
