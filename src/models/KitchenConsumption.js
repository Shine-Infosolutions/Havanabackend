const mongoose = require('mongoose');

const KitchenConsumptionSchema = new mongoose.Schema({
  items: [{
    itemName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: 'pcs'
    },
    purpose: {
      type: String,
      enum: ['cooking', 'preparation', 'cleaning', 'other'],
      default: 'cooking'
    }
  }],
  consumedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  consumptionDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  totalItems: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Calculate total items before saving
KitchenConsumptionSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  next();
});

module.exports = mongoose.model('KitchenConsumption', KitchenConsumptionSchema);