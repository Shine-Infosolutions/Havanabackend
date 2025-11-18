const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Which module this payment is linked to (Booking, Cab, Pantry, etc.)
  sourceType: {
    type: String,
    required: true,
    enum: ['Booking', 'Reservation', 'CabBooking', 'Laundry', 'Pantry', 'Restaurant', 'RoomInspection']
  },

  // Reference ID from the source module (e.g., bookingId)
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'sourceType'
  },

  // If an invoice is generated and linked
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },

  // Unique payment/trxn number (for better audit)
  paymentNumber: {
    type: String,
    unique: true,
    required: true
  },

  // Actual amount paid
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Mode of payment
  paymentMode: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque', 'Other'],
    required: true
  },

  // Advance or final payment
  isAdvance: {
    type: Boolean,
    default: false
  },

  // Status of payment
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Paid'
  },

  // Who collected the payment (optional)
  collectedBy: {
    type: String
  },

  // Any note or remark
  remarks: {
    type: String
  },

  // When payment was received
  receivedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
