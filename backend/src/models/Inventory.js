const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  stockQuantity: { type: Number, required: true, default: 0 },
  reservedQuantity: { type: Number, default: 0 }
}, { timestamps: true });

// Prevent duplicate warehouse-product pairs
inventorySchema.index({ warehouse: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
