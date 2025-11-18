const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
    {
      grcNo: { type: String, unique: true, required: true }, // Guest Registration Card Number
      bookingRefNo: { type: String }, // External reference (e.g., OTA ID)
  
      reservationType: { type: String, enum: ["Online", "Walk-in", "Agent"] }, // Type of booking
      modeOfReservation: String, // Phone, Email, Website, etc.
  
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      }, // Room category selected
  
      bookingDate: { type: Date, default: Date.now }, // When reservation is made
      status: {
        type: String,
        enum: ["Confirmed", "Tentative", "Waiting", "Cancelled"],
        default: "Confirmed",
      },
  
      // Guest Details
      salutation: String,
      guestName: { type: String, required: true },
      nationality: String,
      city: String,
      address: String,
      phoneNo: String,
      mobileNo: String,
      email: String,
      companyName: String,
      gstApplicable: { type: Boolean, default: true },
      companyGSTIN: String,
  
      // Stay Info
      roomHoldStatus: {
        type: String,
        enum: ['Held', 'Pending', 'Released'],
        default: 'Pending'
      }, 
      roomAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
      roomHoldUntil: { type: Date },
      checkInDate: Date,
      checkInTime: String,
      checkOutDate: Date,
      checkOutTime:{type: String,
        default: '12:00',
        immutable: true 
      }, 
      noOfRooms: { type: Number, default: 1 },
      noOfAdults: Number,
      noOfChildren: Number,
      planPackage: String, // EP, CP, MAP, etc.
      rate: Number, // Total rate for the stay
  
      arrivalFrom: String, 
      purposeOfVisit: String, // Business, Leisure, etc.
  
      roomPreferences: {
        smoking: Boolean,
        bedType: String, // e.g., King, Twin
      },
  
      specialRequests: String,
      remarks: String,
      billingInstruction: String,
  
      // Payment Info
      paymentMode: String, // Cash, Card, UPI
      refBy: String, // Referral source (agent, staff, etc.)
      advancePaid: Number,
      isAdvancePaid: { type: Boolean, default: false },
      transactionId: String,
      discountPercent: Number,
      paymentStatus: {
        type: String,
        enum: ["Pending", "Partial", "Paid", "Refunded", "Failed"],
        default: "Pending"
      },
      // Optional Vehicle Details (for early info or VIPs)
      vehicleDetails: {
        vehicleNumber: String,
        vehicleType: String,
        vehicleModel: String,
        driverName: String,
        driverMobile: String,
      },

      vip: { type: Boolean },
      isForeignGuest: { type: Boolean, default: false },
      createdBy: String, // Staff/User who created the reservation
  
      linkedCheckInId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      }, // Link to check-in if completed
  
      // --- Added Fields ---
      cancellationReason: String, // If status is Cancelled
      cancelledBy: String, // Staff/system/user info
      isNoShow: { type: Boolean, default: false }, // For tracking no-shows
    },
    { timestamps: true }
  );
  
module.exports = mongoose.model('Reservation', reservationSchema);