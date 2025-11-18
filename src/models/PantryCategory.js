const mongoose = require('mongoose');

const PantryCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,  // No duplicate category names
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.models.PantryCategory || mongoose.model('PantryCategory', PantryCategorySchema);
