const mongoose = require('mongoose');

const KitchenStoreSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0
  },
  unit: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true,
    default: 'Food'
  }
}, { timestamps: true });

module.exports = mongoose.models.KitchenStore || mongoose.model('KitchenStore', KitchenStoreSchema);