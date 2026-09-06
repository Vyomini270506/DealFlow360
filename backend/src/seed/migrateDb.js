const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Quotation = require('../models/Quotation');
const connectDB = require('../config/db');

const migrate = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB for migration...');

    const closedRes = await Quotation.updateMany(
      { status: { $in: ['Closed', 'CLOSED', 'Confirmed'] } },
      { $set: { status: 'Closed', sellerAgreed: true, customerAgreed: true, salesRepConfirmed: true, customerConfirmed: true } }
    );
    console.log(`Updated ${closedRes.modifiedCount} closed quotations.`);

    const approvedRes = await Quotation.updateMany(
      { status: 'Approved' },
      { $set: { sellerAgreed: true, customerAgreed: false, salesRepConfirmed: true } }
    );
    console.log(`Updated ${approvedRes.modifiedCount} approved quotations.`);

    console.log('Migration complete successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
