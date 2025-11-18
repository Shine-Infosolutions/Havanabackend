const mongoose = require('mongoose');

const cabBookingSchema = new mongoose.Schema({
  purpose: {
    type: String,
    enum: ['guest_transport', 'hotel_supply', 'staff_pickup', 'sightseeing', 'other'],
    default: 'guest_transport', 
    //required: true,
  },

  // Guest or Room Info (only relevant if purpose = guest_transport or sightseeing)
  guestName: String,
  roomNumber: String,
  grcNo: String, // Optional guest linkage
  guestType: {
    type: String,
    enum: ['inhouse', 'external'],
    default: 'inhouse',
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },  
  // Ride Details
  pickupLocation: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  pickupTime: {
    type: Date,
    required: true,
  },
  cabType: {
    type: String,
    enum: ['standard', 'premium', 'suv'],
    default: 'standard',
  },
  specialInstructions: String,
  scheduled: {
    type: Boolean,
    default: false, 
  },

  // Cab Vehicle & Driver Info
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  },
  vehicleNumber: String,
   // ➤ Reference to Driver
   driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
  },
  driverName: { type: String, trim: true },     //  Snapshot

  // Status Tracking
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'on_route', 'completed', 'cancelled'],
    default: 'pending',
  },
  cancellationReason: String,
}, {
  timestamps: true  
});

module.exports = mongoose.models.CabBooking || mongoose.model("CabBooking", cabBookingSchema);