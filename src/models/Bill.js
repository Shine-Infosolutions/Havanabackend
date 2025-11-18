const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantOrder',
    required: true
  },
  billNumber: {
    type: String,
    required: true,
    unique: true
  },
  tableNo: {
    type: String,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  advancePayment: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'split'],
    required: true
  },
  splitPayments: [{
    method: {
      type: String,
      enum: ['cash', 'card', 'upi'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  }],
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  changeAmount: {
    type: Number,
    default: 0
  },
  cashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.models.Bill || mongoose.model('Bill', BillSchema);