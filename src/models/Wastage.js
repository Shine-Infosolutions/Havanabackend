const mongoose = require("mongoose");

const wastageSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ["Food", "Beverage", "Raw Material", "Equipment", "Other"],
    required: true
  },
  department: {
    type: String,
    enum: ["Kitchen", "Restaurant","Pantry"],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ["kg", "grams", "liters", "ml", "pieces", "plates", "bowls"],
    required: true
  },
  reason: {
    type: String,
    enum: ["Expired", "Spoiled", "Overcooked", "Burnt", "Dropped", "Customer Return", "Preparation Error", "Other"],
    required: true
  },
  estimatedCost: {
    type: Number,
    required: true,
    min: 0
  },
  reportedBy: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Wastage", wastageSchema);