const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BanquetCategory",
    required: true,
  },
    
  foodType: {
    type: String,
    required: true,
    enum: ["Veg", "Non-Veg", "Both"]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("MenuItem", menuItemSchema);