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

const resetDatabase = async () => {
  try {
    await connectDB();
    console.log('Explicit DB Reset requested: Wiping all collections...');

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

    console.log('Database collections wiped. Running initial seed...');
    const seedScript = require('./seed');
    await seedScript();
    console.log('Database reset complete.');
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  resetDatabase().then(() => mongoose.connection.close());
}

module.exports = resetDatabase;
