const Fulfillment = require('../models/Fulfillment');
const Backorder = require('../models/Backorder');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Quotation = require('../models/Quotation');

// @desc Get list of fulfillments
// @route GET /api/fulfillment
const getFulfillments = async (req, res) => {
  try {
    const fulfillments = await Fulfillment.find()
      .populate('customer', 'name company email')
      .populate({
        path: 'quotation',
        select: 'quoteNumber grandTotal status salesRep',
        populate: { path: 'salesRep', select: 'name' }
      })
      .populate('items.product', 'name category sku')
      .populate('items.allocations.warehouse', 'name location')
      .sort('-updatedAt');

    res.json(fulfillments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single fulfillment detail
// @route GET /api/fulfillment/:id
const getFulfillmentById = async (req, res) => {
  try {
    const fulfillment = await Fulfillment.findById(req.params.id)
      .populate('customer')
      .populate({
        path: 'quotation',
        populate: [{ path: 'salesRep' }]
      })
      .populate('items.product')
      .populate('items.allocations.warehouse');

    if (!fulfillment) {
      return res.status(404).json({ message: 'Fulfillment record not found' });
    }

    const backorders = await Backorder.find({ fulfillment: fulfillment._id }).populate('product');

    res.json({ fulfillment, backorders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Manual warehouse allocation override by Finance/Ops
// @route PUT /api/fulfillment/:id/override
const overrideAllocation = async (req, res) => {
  try {
    const { itemsAllocations } = req.body; // Array of { productId, allocations: [{ warehouseId, qty }] }
    
    const fulfillment = await Fulfillment.findById(req.params.id);
    if (!fulfillment) {
      return res.status(404).json({ message: 'Fulfillment record not found' });
    }

    for (const overrideItem of itemsAllocations) {
      const item = fulfillment.items.find(i => i.product.toString() === overrideItem.productId.toString());
      if (item) {
        let totalAllocated = 0;
        const newAllocations = [];

        for (const alloc of overrideItem.allocations) {
          totalAllocated += Number(alloc.qty);
          newAllocations.push({
            warehouse: alloc.warehouseId,
            quantity: Number(alloc.qty)
          });
        }

        item.fulfilledQuantity = totalAllocated;
        item.backorderQuantity = Math.max(0, item.requestedQuantity - totalAllocated);
        item.allocations = newAllocations;
      }
    }

    const isFullyFulfilled = fulfillment.items.every(i => i.fulfilledQuantity >= i.requestedQuantity);
    fulfillment.status = isFullyFulfilled ? 'Fulfilled' : 'Partially Fulfilled';

    await fulfillment.save();

    res.json(fulfillment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all backorders
// @route GET /api/fulfillment/backorders
const getBackorders = async (req, res) => {
  try {
    const backorders = await Backorder.find()
      .populate('customer', 'name company')
      .populate('quotation', 'quoteNumber')
      .populate('product', 'name sku category')
      .sort('-createdAt');

    res.json(backorders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getFulfillments, getFulfillmentById, overrideAllocation, getBackorders };
