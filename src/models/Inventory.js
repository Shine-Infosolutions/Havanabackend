const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  itemCode: { type: String, required: true, unique: true },
  categoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'InventoryCategory',
    required: true
  },
  description: { type: String, default: '' },
  currentStock: { type: Number, default: 0 },
  minStockLevel: { type: Number, default: 5 },
  reorderLevel: { type: Number, default: 10 },
  unit: { 
    type: String, 
    enum: ['pieces', 'boxes', 'liters', 'packs', 'kg', 'meters'],
    default: 'pieces' 
  },
  location: { 
    type: String,
    enum: ['Store Room', 'Kitchen Store', 'Floor Storage', 'Laundry Room', 'Maintenance Room'],
    default: 'Store Room'
  },
  supplier: {
    name: { type: String, default: '' },
    contact: { type: String, default: '' }
  },
  pricePerUnit: { type: Number, default: 0 },
  lastPurchased: { type: Date },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  }
}, { timestamps: true });

// Stock Movement Schema
const stockMovementSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  type: { type: String, enum: ['stock-in', 'stock-out'], required: true },
  quantity: { type: Number, required: true },
  issuedTo: { type: String, default: '' },
  reason: { type: String, default: '' },
  notes: { type: String, default: '' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = { Inventory, StockMovement };