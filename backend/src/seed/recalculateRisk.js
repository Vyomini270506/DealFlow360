const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const CustomerRequest = require('../models/CustomerRequest');
const Quotation = require('../models/Quotation');
const Approval = require('../models/Approval');
const { calculateBlendedDiscountRisk } = require('../services/riskEngine');

dotenv.config();

const recalculateAllRiskScores = async () => {
  try {
    await connectDB();
    console.log('Recalculating all database risk scores using single source of truth formula...');

    // 1. Recalculate Customer Requests
    const requests = await CustomerRequest.find().populate('customer').populate('items.product');
    for (const reqDoc of requests) {
      const riskAnalysis = await calculateBlendedDiscountRisk({
        items: reqDoc.items,
        customerId: reqDoc.customer
      });
      reqDoc.riskScore = riskAnalysis.riskScore;
      reqDoc.riskLevel = riskAnalysis.riskLevel;
      reqDoc.managerApprovalRequired = riskAnalysis.managerApprovalRequired;
      reqDoc.approvalRequired = riskAnalysis.approvalRequired;
      reqDoc.financeReviewRequired = riskAnalysis.financeReviewRequired;
      reqDoc.riskFactors = riskAnalysis.riskFactors;
      reqDoc.riskReasons = riskAnalysis.riskReasons;
      await reqDoc.save();
    }
    console.log(`Updated risk scores for ${requests.length} Customer Requests.`);

    // 2. Recalculate Quotations
    const quotations = await Quotation.find().populate('customer').populate('items.product');
    for (const qDoc of quotations) {
      const riskAnalysis = await calculateBlendedDiscountRisk({
        items: qDoc.items,
        customerId: qDoc.customer
      });
      qDoc.riskScore = riskAnalysis.riskScore;
      qDoc.riskLevel = riskAnalysis.riskLevel;
      qDoc.managerApprovalRequired = riskAnalysis.managerApprovalRequired;
      qDoc.approvalRequired = riskAnalysis.approvalRequired;
      qDoc.financeReviewRequired = riskAnalysis.financeReviewRequired;
      qDoc.riskFactors = riskAnalysis.riskFactors;
      qDoc.riskReasons = riskAnalysis.riskReasons;
      await qDoc.save();
    }
    console.log(`Updated risk scores for ${quotations.length} Quotations.`);

    // 3. Recalculate Approvals
    const approvals = await Approval.find().populate('quotation');
    for (const appDoc of approvals) {
      if (appDoc.quotation) {
        const qDoc = await Quotation.findById(appDoc.quotation._id || appDoc.quotation).populate('customer').populate('items.product');
        if (qDoc) {
          const riskAnalysis = await calculateBlendedDiscountRisk({
            items: qDoc.items,
            customerId: qDoc.customer
          });
          appDoc.riskScore = riskAnalysis.riskScore;
          appDoc.riskLevel = riskAnalysis.riskLevel;
          appDoc.riskReasons = riskAnalysis.riskReasons;
          await appDoc.save();
        }
      }
    }
    console.log(`Updated risk scores for ${approvals.length} Approval records.`);

    console.log('Finished risk score recalculation.');
    process.exit(0);
  } catch (err) {
    console.error('Error recalculating risk scores:', err);
    process.exit(1);
  }
};

recalculateAllRiskScores();
