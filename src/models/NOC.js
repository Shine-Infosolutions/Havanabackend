const mongoose = require('mongoose');

const nocSchema = new mongoose.Schema({
  // Basic Details
  name: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['active', 'used'], 
    default: 'active' 
  },
  authorityType: { 
    type: String, 
    enum: ['gm', 'manager', 'other'], 
    required: true 
  },
  isCompletelyFree: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });



module.exports = mongoose.model('NOC', nocSchema);
