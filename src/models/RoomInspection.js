const mongoose = require('mongoose');

const roomInspectionSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  inspectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inspectionType: {
    type: String,
    enum: ['checkout', 'maintenance', 'regular', 'deep-clean'],
    default: 'checkout'
  },
  checklist: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: false
    },
    item: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['ok', 'missing', 'damaged', 'used'],
      default: 'ok'
    },
    remarks: String,
    costPerUnit: Number
  }],
  totalCharges: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'completed'
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('RoomInspection', roomInspectionSchema);