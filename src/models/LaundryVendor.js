const mongoose = require("mongoose");

const laundryVendorSchema = new mongoose.Schema({
  vendorName: {
    type: String,
    required: true,
    trim: true,
  },

  contactPerson: {
    type: String,
    trim: true,
  },

  phoneNumber: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
  },

  email: {
    type: String,
    trim: true,
    lowercase: true,
  },

  address: {
    type: String,
    trim: true,
  },

  gstNumber: {
    type: String,
    trim: true,
  },

  UpiID: {
    type: String,
    trim: true
  },
  scannerImg: {
    type: String
  },

  isActive: {
    type: Boolean,
    default: true
  },
  remarks: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("LaundryVendor", laundryVendorSchema);
