const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Fulfillment = require('../models/Fulfillment');
const Backorder = require('../models/Backorder');

/**
 * Automatically allocates stock across multi-warehouses for a confirmed quotation
 * @param {Object} quotation - Quotation populated with items and customer
 * @returns {Object} fulfillment record
 */
const allocateFulfillmentStock = async (quotation) => {
  let fulfillment = await Fulfillment.findOne({ quotation: quotation._id });

  if (!fulfillment) {
    fulfillment = new Fulfillment({
      quotation: quotation._id,
      customer: quotation.customer,
      status: 'Awaiting Allocation',
      items: []
    });
  }

  const fulfillmentItems = [];

  for (const item of quotation.items) {
    const productId = item.product._id || item.product;
    const requiredQty = item.quantity;

    // Find all warehouse inventories for this product
    const inventories = await Inventory.find({ product: productId }).populate('warehouse');
    
    let remainingToFulfill = requiredQty;
    let totalFulfilled = 0;
    const allocations = [];

    // Prioritize warehouses with highest available stock
    const sortedInventories = inventories.sort((a, b) => 
      (b.stockQuantity - b.reservedQuantity) - (a.stockQuantity - a.reservedQuantity)
    );

    for (const inv of sortedInventories) {
      if (remainingToFulfill <= 0) break;

      const available = Math.max(0, inv.stockQuantity - inv.reservedQuantity);
      if (available > 0) {
        const take = Math.min(available, remainingToFulfill);
        allocations.push({
          warehouse: inv.warehouse._id,
          quantity: take
        });

        // Reserve inventory
        inv.reservedQuantity += take;
        await inv.save();

        remainingToFulfill -= take;
        totalFulfilled += take;
      }
    }

    const backorderQty = Math.max(0, requiredQty - totalFulfilled);

    fulfillmentItems.push({
      product: productId,
      requestedQuantity: requiredQty,
      fulfilledQuantity: totalFulfilled,
      backorderQuantity: backorderQty,
      allocations
    });

    // If backorder exists, create Backorder record
    if (backorderQty > 0) {
      await Backorder.create({
        fulfillment: fulfillment._id,
        quotation: quotation._id,
        customer: quotation.customer,
        product: productId,
        quantity: backorderQty,
        status: 'Pending',
        estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days default
      });
    }
  }

  const hasBackorders = fulfillmentItems.some(i => i.backorderQuantity > 0);
  const isFullyFulfilled = fulfillmentItems.every(i => i.fulfilledQuantity >= i.requestedQuantity);

  fulfillment.items = fulfillmentItems;
  fulfillment.status = isFullyFulfilled ? 'Fulfilled' : (hasBackorders ? 'Partially Fulfilled' : 'Awaiting Allocation');
  await fulfillment.save();

  return fulfillment;
};

module.exports = { allocateFulfillmentStock };
