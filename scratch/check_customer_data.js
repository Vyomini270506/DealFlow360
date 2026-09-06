const path = require('path');
const backendPath = (mod) => path.join(__dirname, '../backend/node_modules', mod);

const mongoose = require(backendPath('mongoose'));
require(backendPath('dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

const CustomerRequest = require('../backend/src/models/CustomerRequest');
const Quotation = require('../backend/src/models/Quotation');

async function inspectData() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dealflow360');
  console.log('Connected to MongoDB');

  const requests = await CustomerRequest.find({}).populate('customer').populate('user');
  console.log(`Total Customer Requests in DB: ${requests.length}`);
  requests.forEach(r => {
    console.log(`- Request ID: ${r._id}, Num: ${r.requestNumber}, Status: ${r.status}, Customer: ${r.customer?.name || r.customer?.company || 'N/A'}, Created: ${r.createdAt}`);
  });

  const quotes = await Quotation.find({});
  console.log(`Total Quotations in DB: ${quotes.length}`);
  quotes.forEach(q => {
    console.log(`- Quote ID: ${q._id}, Num: ${q.quoteNumber}, Status: ${q.status}, Created: ${q.createdAt}`);
  });

  await mongoose.disconnect();
}

inspectData().catch(console.error);
