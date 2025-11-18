const mongoose = require('mongoose');

const gstSchema = new mongoose.Schema({
  totalGST: { 
    type: Number,
    min: 0,
    max: 100 
  },
  cgst: { 
    type: Number,
    min: 0 
  },
  sgst: { 
    type: Number,
    min: 0 
  },

}, { timestamps: true });



// Indexes
gstSchema.index({ totalGST: 1 });

module.exports = mongoose.model('GST', gstSchema);