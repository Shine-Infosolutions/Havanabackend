const mongoose = require('mongoose');

const restaurantCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.models.RestaurantCategory || mongoose.model('RestaurantCategory', restaurantCategorySchema);