const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['order_ready', 'general'],
    default: 'general'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantOrder'
  },
  kotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KOT'
  },
  tableNo: String,
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);