const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema({
  // Dynamic categories - allows any category name with array of menu items
  categories: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Reference to booking
  bookingRef: {
    type: mongoose.Schema.Types.Mixed,
    unique: true
  },
  customerRef: { type: String, required: true, unique: true },
  
  //   count: {
  //   type: Number,
  //   default: 0
  // },

  // canCustomerEdit: {
  //   type: Boolean,
  //   default: true
  // }
}, {
  timestamps: true
});

const Menu = mongoose.model("Menu", menuSchema);

module.exports = Menu;