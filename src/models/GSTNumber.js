const mongoose = require('mongoose');

const gstNumberSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  mobileNumber: {
    type: String,
    match: [/^[0-9]{10}$/, 'Mobile number must be 10 digits']
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true
  },

}, { timestamps: true });

// Indexes (removed unique constraint on gstNumber to allow updates)
gstNumberSchema.index({ mobileNumber: 1 });
gstNumberSchema.index({ company: 1 });
gstNumberSchema.index({ city: 1 });

module.exports = mongoose.model('GSTNumber', gstNumberSchema);