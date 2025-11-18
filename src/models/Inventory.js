const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['Amenity', 'Cleaning', 'Maintenance', 'Food', 'Beverage', 'Linen', 'Toiletry','Snakes','Other'],
    required: true
  },
  currentStock: { 
    type: Number, 
    required: true,
    min: 0
  },
  unit: { 
    type: String, 
    required: true 
  },
  minThreshold: { 
    type: Number, 
    required: true,
    min: 0
  },
  reorderQuantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  costPerUnit: { 
    type: Number, 
    required: true 
  },
  supplier: { 
    name: String,
    contactPerson: String,
    phone: String,
    email: String,
    address: String
  },
  location: { 
    type: String,
    default: 'Main Storage'
  },
  lastReorderDate: { 
    type: Date 
  },
  isLowStock: { 
    type: Boolean, 
    default: false 
  },
  autoReorder: { 
    type: Boolean, 
    default: false 
  },
  notes: { 
    type: String 
  }
}, { timestamps: true });

// Virtual for checking if reordering is needed
InventorySchema.virtual('needsReorder').get(function() {
  return this.currentStock <= this.minThreshold;
});

// Pre-save hook to update isLowStock flag
InventorySchema.pre('save', function(next) {
  this.isLowStock = this.currentStock <= this.minThreshold;
  next();
});

module.exports = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);