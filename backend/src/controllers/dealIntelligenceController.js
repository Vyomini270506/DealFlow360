const dealIntelligenceService = require('../services/dealIntelligenceService');
const Quotation = require('../models/Quotation');

// @desc Get Deal Risk Radar for a specific quotation
// @route GET /api/intelligence/risk-radar/:quotationId
const getRiskRadar = async (req, res) => {
  try {
    const radar = await dealIntelligenceService.getDealRiskRadar(req.params.quotationId);
    res.json(radar);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get Deal Health Score (0-100)
// @route GET /api/intelligence/health-score/:quotationId
const getHealthScore = async (req, res) => {
  try {
    const health = await dealIntelligenceService.getDealHealthScore(req.params.quotationId);
    res.json(health);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc AI Best Counter Offer recommendation
// @route POST /api/intelligence/counter-offer/:quotationId
const getCounterOffer = async (req, res) => {
  try {
    const { requestedDiscountPercent } = req.body;
    const counter = await dealIntelligenceService.getBestCounterOffer(req.params.quotationId, requestedDiscountPercent);
    res.json(counter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Profit Protection Mode calculation
// @route POST /api/intelligence/profit-protection
const getProfitProtection = async (req, res) => {
  try {
    const { items, customerId } = req.body;
    const profit = await dealIntelligenceService.calculateProfitProtection(items, customerId);
    res.json(profit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Approval Simulator
// @route POST /api/intelligence/approval-simulator
const simulateApproval = async (req, res) => {
  try {
    const { items, customerId } = req.body;
    const simulation = await dealIntelligenceService.simulateApprovalChain(items, customerId);
    res.json(simulation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Negotiation Heat Meter
// @route GET /api/intelligence/negotiation-heat/:quotationId
const getNegotiationHeat = async (req, res) => {
  try {
    const heat = await dealIntelligenceService.getNegotiationHeat(req.params.quotationId);
    res.json(heat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Customer Negotiation Memory
// @route GET /api/intelligence/customer-memory/:customerId
const getCustomerMemory = async (req, res) => {
  try {
    const memory = await dealIntelligenceService.getCustomerNegotiationMemory(req.params.customerId);
    res.json(memory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Smart Warehouse Delivery Promise
// @route POST /api/intelligence/warehouse-promise
const getWarehousePromise = async (req, res) => {
  try {
    const { items } = req.body;
    const promise = await dealIntelligenceService.getSmartWarehousePromise(items);
    res.json(promise);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Deal Rescue Center (Deals Needing Attention)
// @route GET /api/intelligence/deals-needing-attention
const getRescueDeals = async (req, res) => {
  try {
    const deals = await dealIntelligenceService.getDealsNeedingAttention(req.user);
    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRiskRadar,
  getHealthScore,
  getCounterOffer,
  getProfitProtection,
  simulateApproval,
  getNegotiationHeat,
  getCustomerMemory,
  getWarehousePromise,
  getRescueDeals
};
