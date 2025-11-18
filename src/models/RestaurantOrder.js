const mongoose = require('mongoose');

const RestaurantOrderSchema = new mongoose.Schema({
  staffName: {
    type: String,
    required: true
  },
   // For in-house (hotel guest) orders
   bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  grcNo: String,
  roomNumber: String,
  guestName: String,
  guestPhone: String,
  customerName: {
    type: String,
    required: false
  },
  tableNo: {
    type: String,
    required: true
  },
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    itemName: { type: String }, 
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  notes: String,
  status: {
    type: String,
    enum: ['reserved','running', 'served', 'paid', 'completed' ],
  },
  amount: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  couponCode: String,
  isMembership: {
    type: Boolean,
    default: false
  },
  isLoyalty: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transferHistory: [{
    fromTable: String,
    toTable: String,
    reason: String,
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    transferredAt: {
      type: Date,
      default: Date.now
    }
  }],
  transactionHistory: [{
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    transactionId: String,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: {
      type: Date,
      default: Date.now
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill'
    }
  }]
}, { timestamps: true });

module.exports = mongoose.models.RestaurantOrder || mongoose.model('RestaurantOrder', RestaurantOrderSchema);