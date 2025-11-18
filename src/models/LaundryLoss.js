const mongoose = require('mongoose');

const laundryLossSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Laundry',
    required: true
  },
  roomNumber: {
    type: String,
    required: true
  },
  guestName: String,
  lostItems: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    itemName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    calculatedAmount: {
      type: Number,
      required: true
    }
  }],
  lossNote: {
    type: String,
    required: true
  },
  reportedBy: String,
  totalLossAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['reported', 'investigating', 'resolved', 'compensated'],
    default: 'reported'
  }
}, { timestamps: true });

module.exports = mongoose.model('LaundryLoss', laundryLossSchema);