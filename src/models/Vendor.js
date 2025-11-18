const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  companyName: {
    type: String,
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  address: {
    type: String
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
  }
}, { timestamps: true });

module.exports = mongoose.models.Vendor || mongoose.model('Vendor', VendorSchema);
