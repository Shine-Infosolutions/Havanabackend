const mongoose = require('mongoose');

const RoomInventorySchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['in-use', 'missing', 'damaged'],
    default: 'in-use'
  },

userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: false   
},
  remarks: String
}, { timestamps: true });

module.exports = mongoose.models.RoomInventory || mongoose.model('RoomInventory', RoomInventorySchema);
