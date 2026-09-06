const Quotation = require('../models/Quotation');
const Approval = require('../models/Approval');
const Invoice = require('../models/Invoice');
const Fulfillment = require('../models/Fulfillment');

// @desc Get analytics dashboard reporting statistics
// @route GET /api/analytics/reporting
const getReportingStats = async (req, res) => {
  try {
    const quotations = await Quotation.find().populate('customer').populate('salesRep').populate('items.product');
    const approvals = await Approval.find();
    const invoices = await Invoice.find();

    let totalPipelineValue = 0;
    let totalRevenueCollected = 0;
    let pendingApprovalCount = 0;
    let approvedCount = 0;

    const repRevenueMap = {};
    const productRevenueMap = {};
    const customerRevenueMap = {};

    quotations.forEach(q => {
      totalPipelineValue += q.grandTotal;

      if (q.status === 'Pending Approval') pendingApprovalCount++;
      if (q.status === 'Approved' || q.status === 'Completed' || q.status === 'Fulfillment') approvedCount++;

      if (q.salesRep && q.salesRep.name) {
        repRevenueMap[q.salesRep.name] = (repRevenueMap[q.salesRep.name] || 0) + q.grandTotal;
      }

      if (q.customer && q.customer.company) {
        customerRevenueMap[q.customer.company] = (customerRevenueMap[q.customer.company] || 0) + q.grandTotal;
      }

      q.items.forEach(item => {
        if (item.product && item.product.name) {
          productRevenueMap[item.product.name] = (productRevenueMap[item.product.name] || 0) + item.lineTotal;
        }
      });
    });

    invoices.forEach(inv => {
      totalRevenueCollected += inv.amountPaid || 0;
    });

    const revenueByRep = Object.keys(repRevenueMap).map(rep => ({ name: rep, value: repRevenueMap[rep] }));
    const revenueByCustomer = Object.keys(customerRevenueMap).map(cust => ({ name: cust, value: customerRevenueMap[cust] }));
    const revenueByProduct = Object.keys(productRevenueMap).map(prod => ({ name: prod, value: productRevenueMap[prod] }));

    res.json({
      totalPipelineValue,
      totalRevenueCollected,
      pendingApprovalCount,
      approvedCount,
      revenueByRep,
      revenueByCustomer,
      revenueByProduct
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get Deal Health monitoring alerts and scores
// @route GET /api/analytics/deal-health
const getDealHealthMetrics = async (req, res) => {
  try {
    const Quotation = require('../models/Quotation');
    const Fulfillment = require('../models/Fulfillment');
    const DealHealth = require('../models/DealHealth');

    const quotations = await Quotation.find()
      .populate('customer', 'name company tier')
      .populate('salesRep', 'name email')
      .populate('items.product', 'name category');

    const fulfillments = await Fulfillment.find();
    const fulfillmentMap = {};
    fulfillments.forEach(f => {
      fulfillmentMap[f.quotation.toString()] = f;
    });

    const dbHealthDocs = await DealHealth.find();
    const healthDocMap = {};
    dbHealthDocs.forEach(h => {
      healthDocMap[h.quotation.toString()] = h;
    });

    const deals = quotations.map(q => {
      const alerts = [];
      const fulfillment = fulfillmentMap[q._id.toString()];
      const dbHealth = healthDocMap[q._id.toString()];

      if (dbHealth && dbHealth.alerts && dbHealth.alerts.length > 0) {
        dbHealth.alerts.forEach(a => alerts.push(a));
      }

      // Check discount anomaly
      const maxItemDiscount = q.items.reduce((max, item) => Math.max(max, item.discountPercent || 0), 0);
      if (maxItemDiscount > 20) {
        alerts.push({
          type: 'DISCOUNT_ANOMALY',
          severity: 'HIGH',
          message: `Item discount of ${maxItemDiscount}% exceeds normal threshold`,
          whyItMatters: `High discounts severely erode gross margin by up to 18%.`,
          recommendedAction: `Review discount justification with Sales Manager.`
        });
      }

      // Check delivery slippage
      if (fulfillment && (fulfillment.status === 'Delivery Slippage' || fulfillment.items.some(i => i.backorderQuantity > 0))) {
        alerts.push({
          type: 'DELIVERY_SLIPPAGE',
          severity: 'MEDIUM',
          message: `Warehouse stock shortage leading to partial fulfillment / backorder`,
          whyItMatters: `Customer delivery timeline is at risk of 7-day delay.`,
          recommendedAction: `Expedite backorder inventory or re-allocate from secondary warehouse.`
        });
      }

      // Check stalled approval
      if (q.status === 'Pending Approval') {
        alerts.push({
          type: 'APPROVAL_BOTTLENECK',
          severity: 'MEDIUM',
          message: `Quotation pending approval at ${q.approvalChainState} stage`,
          whyItMatters: `Approval turn-around time is exceeding SLA (24h).`,
          recommendedAction: `Nudge the approver or evaluate fast-track override.`
        });
      }

      const healthScore = dbHealth ? dbHealth.healthScore : Math.max(0, 100 - (q.riskScore || 0));

      return {
        _id: q._id,
        quoteNumber: q.quoteNumber,
        customer: q.customer,
        salesRep: q.salesRep,
        grandTotal: q.grandTotal,
        status: q.status,
        riskScore: q.riskScore,
        riskLevel: q.riskLevel,
        healthScore,
        alerts
      };
    });

    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getReportingStats, getDealHealthMetrics };
