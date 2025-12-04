const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNo: { type: String, unique: true, index: true },
  grcNo: { type: String, unique: true, required: true },  // Guest Registration Card No
  invoiceNumber: { type: String, unique: true },  // Invoice number like HH/12/0001
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },

  bookingDate: { type: Date, default: Date.now },
  numberOfRooms: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  days: { type: Number },
  timeIn: { type: String },
  timeOut: {
    type: String,
    default: '12:00',
    immutable: true 
  },
  
  // 🔹 Exact Check-in/Check-out Times
  actualCheckInTime: { type: Date },  // Exact timestamp when guest checked in
  actualCheckOutTime: { type: Date }, // Exact timestamp when guest checked out
  
  // 🔹 Late Checkout Fine System
  lateCheckoutFine: {
    amount: { type: Number, default: 0 },
    minutesLate: { type: Number, default: 0 },
    finePerHour: { type: Number, default: 500 }, // ₹500 per hour after grace period
    gracePeriodMinutes: { type: Number, default: 15 }, // 15 minutes grace period
    applied: { type: Boolean, default: false },
    appliedAt: { type: Date },
    waived: { type: Boolean, default: false },
    waivedBy: { type: String },
    waivedReason: { type: String }
  },  

  salutation: { type: String, enum: ['mr.', 'mrs.', 'ms.', 'dr.', 'other'], default: 'mr.' },
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  address: { type: String },
  city: { type: String },
  nationality: { type: String },
  mobileNo: { type: String, required: true },
  email: { type: String },
  phoneNo: { type: String },
  birthDate: { type: Date },
  anniversary: { type: Date },

  companyName: { type: String },
  companyGSTIN: { type: String },

  idProofType: {
    type: String,
    enum: ['Aadhaar', 'PAN', 'Voter ID', 'Passport', 'Driving License', 'Other']
  },  idProofNumber: { type: String },
  idProofImageUrl: { type: String },
  idProofImageUrl2: { type: String },
  photoUrl: { type: String },

  roomNumber: { type: String },
  planPackage: { type: String }, //cp map/ mp
  noOfAdults: { type: Number },
  noOfChildren: { type: Number },
  roomGuestDetails: [{
    roomNumber: { type: String, required: true },
    adults: { type: Number, default: 1, min: 1 },
    children: { type: Number, default: 0, min: 0 }
  }],
  roomRates: [{
    roomNumber: { type: String, required: true },
    customRate: { type: Number, default: 0 },
    extraBed: { type: Boolean, default: false },
    extraBedStartDate: { type: Date, default: null }
  }],
  extraBed: { type: Boolean, default: false },
  extraBedCharge: { type: Number, default: 0 },
  extraBedRooms: [{ type: String }], // Array of room numbers that have extra beds
  rate: { type: Number },
  taxableAmount: { type: Number },
  cgstAmount: { type: Number },
  sgstAmount: { type: Number },
  cgstRate: { type: Number, default: 0.025 },
  sgstRate: { type: Number, default: 0.025 },
  taxIncluded: { type: Boolean, default: false },
  serviceCharge: { type: Boolean, default: false },

  arrivedFrom: { type: String },
  destination: { type: String },
  remark: { type: String },
  businessSource: { type: String },
  marketSegment: { type: String },
  purposeOfVisit: { type: String },

  discountPercent: { type: Number, default: 0 },
  discountRoomSource: { type: Number, default: 0 },
  discountNotes: { type: String },

  paymentMode: { type: String },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Paid', 'Failed', 'Partial'],
    default: 'Pending'
  },
  transactionId: { type: String },

  // Multiple Advance Payments
  advancePayments: [{
    amount: { type: Number, required: true },
    paymentMode: { type: String, required: true },
    paymentDate: { type: Date, default: Date.now },
    reference: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  totalAdvanceAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },

  bookingRefNo: { type: String },
  
  mgmtBlock: { type: String, enum: ['Yes', 'No'], default: 'No' },
  billingInstruction: { type: String },

  temperature: { type: Number },

  fromCSV: { type: Boolean, default: false },
  epabx: { type: Boolean, default: false },
  vip: { type: Boolean, default: false },

  status: { 
    type: String, 
    enum: ['Booked', 'Checked In', 'Checked Out', 'Cancelled'], 
    default: 'Booked' 
  },

  // 🔹 Extension History
  extensionHistory: [
    {
      originalCheckIn: { type: Date },
      originalCheckOut: { type: Date },
      extendedCheckOut: { type: Date },
      extendedOn: { type: Date, default: Date.now },
      reason: String,
      additionalAmount: Number,
      paymentMode: {
        type: String,
        enum: ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other']
      },
      approvedBy: String
    }
  ],

  // 🔹 Amendment History
  amendmentHistory: [
    {
      originalCheckIn: { type: Date },
      originalCheckOut: { type: Date },
      originalDays: { type: Number },
      newCheckIn: { type: Date },
      newCheckOut: { type: Date },
      newDays: { type: Number },
      amendedOn: { type: Date, default: Date.now },
      reason: String,
      rateAdjustment: { type: Number, default: 0 },
      extraBedAdjustment: { type: Number, default: 0 },
      totalAdjustment: { type: Number, default: 0 },
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' },
      approvedBy: String,
      approvedOn: Date
    }
  ],

  // 🔹 Soft Delete
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: String },
}, { timestamps: true });

// Add bookingNo index for fast lookups
bookingSchema.index({ bookingNo: 1 }, { unique: true });

// Pre-save middleware to generate unique bookingNo and invoiceNumber
bookingSchema.pre('save', async function(next) {
  if (!this.bookingNo) {
    let unique = false;
    while (!unique) {
      const timestamp = Date.now();
      const bookingNo = `BK${timestamp}`;
      const existing = await this.constructor.findOne({ bookingNo });
      if (!existing) {
        this.bookingNo = bookingNo;
        unique = true;
      }
      // Add small delay to ensure different timestamp if collision
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
  
  // Generate invoice number if not exists
  if (!this.invoiceNumber) {
    console.log('🔥 Generating invoice number...');
    const currentDate = new Date();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    
    // Find all existing invoice numbers (excluding deleted)
    const existingInvoices = await this.constructor.find({
      deleted: { $ne: true },
      invoiceNumber: { $exists: true, $ne: null }
    }).select('invoiceNumber').lean();
    
    console.log('📋 Existing invoices:', existingInvoices);
    
    // Extract numbers and find highest
    let maxNumber = 0;
    existingInvoices.forEach(invoice => {
      const parts = invoice.invoiceNumber.split('/');
      if (parts.length === 3) {
        const num = parseInt(parts[2]);
        if (num > maxNumber) maxNumber = num;
      }
    });
    
    const nextNumber = maxNumber + 1;
    const sequence = String(nextNumber).padStart(4, '0');
    this.invoiceNumber = `HH/${month}/${sequence}`;
    
    console.log('✅ Generated invoice:', this.invoiceNumber);
  }
  
  // 🔹 Calculate Late Checkout Fine
  if (this.actualCheckOutTime && this.status === 'Checked Out' && !this.lateCheckoutFine.applied) {
    const checkoutDate = new Date(this.checkOutDate);
    const [hours, minutes] = this.timeOut.split(':').map(Number);
    
    // Create expected checkout time without mutating original date
    const expectedCheckoutTime = new Date(checkoutDate.getFullYear(), checkoutDate.getMonth(), checkoutDate.getDate(), hours, minutes, 0, 0);
    
    const actualCheckout = new Date(this.actualCheckOutTime);
    const timeDiffMs = actualCheckout - expectedCheckoutTime;
    
    console.log(`🔍 Debug: Expected: ${expectedCheckoutTime.toISOString()}, Actual: ${actualCheckout.toISOString()}, Diff: ${timeDiffMs}ms`);
    
    if (timeDiffMs > 0) {
      const minutesLate = Math.ceil(timeDiffMs / (1000 * 60));
      const gracePeriod = this.lateCheckoutFine.gracePeriodMinutes || 15;
      
      // Validation: Only apply fine if late by reasonable amount (max 24 hours)
      if (minutesLate > gracePeriod && minutesLate <= 1440) { // 1440 minutes = 24 hours
        const chargeableMinutes = minutesLate - gracePeriod;
        const chargeableHours = Math.ceil(chargeableMinutes / 60); // Round up to next hour
        const fineAmount = chargeableHours * (this.lateCheckoutFine.finePerHour || 500);
        
        this.lateCheckoutFine.minutesLate = minutesLate;
        this.lateCheckoutFine.amount = fineAmount;
        this.lateCheckoutFine.applied = true;
        this.lateCheckoutFine.appliedAt = new Date();
        
        console.log(`⏰ Late checkout fine applied: ₹${fineAmount} for ${chargeableHours} hour(s) (${chargeableMinutes} minutes late)`);
      } else if (minutesLate > 1440) {
        console.log(`⚠️ Checkout time difference too large (${minutesLate} minutes). Fine not applied.`);
      }
    } else {
      console.log(`✅ Early checkout - no fine applied`);
    }
  }
  
  next();
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
