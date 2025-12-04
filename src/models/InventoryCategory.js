const mongoose = require('mongoose');

const inventoryCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true,
    enum: ['Housekeeping', 'Consumables', 'Kitchen', 'Linen', 'Maintenance', 'Electronics', 'Furniture', 'Safety', 'Office Supplies', 'Beverages', 'Food Items', 'Cleaning Supplies', 'Guest Amenities', 'Uniforms', 'Technology']
  },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryCategory', inventoryCategorySchema);