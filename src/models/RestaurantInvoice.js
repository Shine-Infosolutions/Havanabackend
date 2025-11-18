const mongoose = require('mongoose');

const restaurantInvoiceSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantOrder',
    required: true,
    unique: true
  },
  clientDetails: {
    name: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    mobileNo: {
      type: String,
      trim: true
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true
    }
  }
}, { timestamps: true });

// Indexes
restaurantInvoiceSchema.index({ 'clientDetails.gstin': 1 });

module.exports = mongoose.model('RestaurantInvoice', restaurantInvoiceSchema);