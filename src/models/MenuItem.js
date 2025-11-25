const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  Price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  Discount: {
    type: Number,
    default: 0,
    min: 0
  },
  foodType: {
    type: String,
    required: true,
    enum: ["Veg", "Non-Veg", "Both"]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  timeToPrepare: {
    type: Number,
    default: 0,
    min: 0
  },
  image: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("MenuItem", menuItemSchema);