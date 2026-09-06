const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const dealIntelligenceService = require('../services/dealIntelligenceService');
const User = require('../models/User');

dotenv.config();

async function testRescueDeals() {
  await connectDB();
  const user = await User.findOne({ role: 'SALES_MANAGER' });
  const rescueDeals = await dealIntelligenceService.getDealsNeedingAttention(user);
  console.log(`Rescue Deals count: ${rescueDeals.length}`);
  console.log(rescueDeals);
  process.exit(0);
}

testRescueDeals().catch(err => {
  console.error(err);
  process.exit(1);
});
