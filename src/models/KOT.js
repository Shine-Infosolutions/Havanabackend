const mongoose = require('mongoose');

const KOTSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantOrder',
    required: true
  },
  kotNumber: {
    type: String,
    required: true,
    unique: true
  },
  tableNo: {
    type: String,
    required: true
  },
  // Room service fields
  guestName: String,
  roomNumber: String,
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    itemName: String,
    quantity: { type: Number, required: true },
    specialInstructions: String
  }],
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  estimatedTime: Number, // in minutes
  actualTime: Number, // in minutes
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedChef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  itemStatuses: [{
    itemIndex: Number,
    status: { type: String, enum: ['served', 'delivered'] },
    updatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.models.KOT || mongoose.model('KOT', KOTSchema);