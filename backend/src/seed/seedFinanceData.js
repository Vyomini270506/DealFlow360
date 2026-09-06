const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

// Require all models first
const Customer = require('../models/Customer');
const User = require('../models/User');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const CreditNote = require('../models/CreditNote');

dotenv.config();

async function seedFinanceRecords() {
  await connectDB();
  console.log('--- Seeding Finance Payments, Credit Notes & Synchronizing Invoice Statuses ---');

  const financeUser = await User.findOne({ role: 'FINANCE_OPERATIONS' }) || await User.findOne({ role: 'ADMIN' });
  if (!financeUser) {
    console.error('No Finance or Admin user found for recording payments!');
    process.exit(1);
  }

  const invoices = await Invoice.find().populate('customer');
  console.log(`Found ${invoices.length} Invoices in MongoDB.`);

  if (invoices.length === 0) {
    console.log('No invoices found. Please run npm run seed:test first.');
    process.exit(0);
  }

  let paymentsCreated = 0;
  let creditNotesCreated = 0;

  for (let idx = 0; idx < invoices.length; idx++) {
    const inv = invoices[idx];
    const grandTotal = inv.grandTotal || 0;

    // Check existing payments
    const existingPayments = await Payment.find({ invoice: inv._id });
    if (existingPayments.length === 0 && grandTotal > 0) {
      if (idx % 3 === 0) {
        // FULLY PAID
        const payCount = await Payment.countDocuments();
        const paymentNumber = `PAY-${20000 + payCount + 1}`;
        await Payment.create({
          paymentNumber,
          invoice: inv._id,
          customer: inv.customer._id || inv.customer,
          amount: grandTotal,
          paymentMethod: 'BANK_TRANSFER',
          transactionReference: `UTR-${Date.now()}-${idx}`,
          notes: 'Full payment received via NEFT bank transfer',
          recordedBy: financeUser._id,
          paymentDate: new Date(Date.now() - (idx * 2) * 24 * 60 * 60 * 1000)
        });
        paymentsCreated++;

        inv.amountPaid = grandTotal;
        inv.paymentStatus = 'PAID';
        await inv.save();
      } else if (idx % 3 === 1) {
        // PARTIALLY PAID
        const partialAmount = Math.round(grandTotal * 0.4);
        const payCount = await Payment.countDocuments();
        const paymentNumber = `PAY-${20000 + payCount + 1}`;
        await Payment.create({
          paymentNumber,
          invoice: inv._id,
          customer: inv.customer._id || inv.customer,
          amount: partialAmount,
          paymentMethod: 'CREDIT_CARD',
          transactionReference: `TXN-${Date.now()}-${idx}`,
          notes: 'Initial 40% partial payment received',
          recordedBy: financeUser._id,
          paymentDate: new Date(Date.now() - (idx * 1.5) * 24 * 60 * 60 * 1000)
        });
        paymentsCreated++;

        inv.amountPaid = partialAmount;
        const isPastDue = inv.dueDate && new Date(inv.dueDate) < new Date();
        inv.paymentStatus = isPastDue ? 'OVERDUE' : 'PARTIALLY_PAID';
        await inv.save();
      } else {
        // UNPAID / OVERDUE
        inv.amountPaid = 0;
        const isPastDue = inv.dueDate && new Date(inv.dueDate) < new Date();
        inv.paymentStatus = isPastDue ? 'OVERDUE' : 'UNPAID';
        await inv.save();
      }
    }

    // Seed a couple credit notes for demonstration
    if (idx === 1 || idx === 4) {
      const existingCN = await CreditNote.findOne({ invoice: inv._id });
      if (!existingCN) {
        const cnCount = await CreditNote.countDocuments();
        await CreditNote.create({
          creditNoteNumber: `CN-${7000 + cnCount + 1}`,
          invoice: inv._id,
          customer: inv.customer._id || inv.customer,
          amount: Math.round(grandTotal * 0.05),
          reason: 'BILLING_CORRECTION',
          description: 'Authorized 5% commercial billing adjustment',
          status: 'APPROVED',
          issuedBy: financeUser._id,
          issuedAt: new Date()
        });
        creditNotesCreated++;
      }
    }
  }

  console.log(`✅ Seeded ${paymentsCreated} real Payments and ${creditNotesCreated} Credit Notes.`);
  console.log('✅ Synchronized all Invoice payment statuses in MongoDB.');
  process.exit(0);
}

seedFinanceRecords().catch(err => {
  console.error(err);
  process.exit(1);
});
