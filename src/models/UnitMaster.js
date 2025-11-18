const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  shortName: {
    type: String,
    required: true,
    trim: true
  }
}, { timestamps: true });

// Indexes
unitSchema.index({ name: 1 });
unitSchema.index({ shortName: 1 });

module.exports = mongoose.model('Unit', unitSchema);