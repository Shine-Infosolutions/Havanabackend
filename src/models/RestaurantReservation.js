const mongoose = require('mongoose');

const RestaurantReservationSchema = new mongoose.Schema({
  reservationNumber: {
    type: String,
    required: true,
    unique: true
  },
  guestName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  partySize: {
    type: Number,
    required: true,
    min: 1
  },
  reservationDate: {
    type: Date,
    required: true
  },
  reservationTimeIn: {
    type: String,
    required: true
  },
  reservationTimeOut: {
    type: String,
    required: true
  },
  tableNo: {
    type: String
  },
  status: {
    type: String,
    enum: ['enquiry', 'reserved', 'complete'],
    default: 'enquiry'
  },
  specialRequests: {
    type: String
  },
  advancePayment: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.models.RestaurantReservation || mongoose.model('RestaurantReservation', RestaurantReservationSchema);