const mongoose = require("mongoose");

const roomServiceSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  serviceType: { type: String, enum: ['restaurant', 'laundry', 'cleaning'], required: true },
  roomNumber: { type: String, required: true },
  guestName: { type: String, required: true },
  grcNo: { type: String },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  
  items: [{
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    category: { type: String },
    specialInstructions: { type: String }
  }],
  
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  status: { 
    type: String, 
    enum: ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"], 
    default: "pending" 
  },
  
  paymentStatus: { 
    type: String, 
    enum: ["unpaid", "paid", "partial"], 
    default: "unpaid" 
  },
  
  kotGenerated: { type: Boolean, default: false },
  kotNumber: { type: String },
  kotGeneratedAt: { type: Date },
  
  billGenerated: { type: Boolean, default: false },
  billNumber: { type: String },
  billGeneratedAt: { type: Date },
  
  deliveryTime: { type: Date },
  estimatedDeliveryTime: { type: Date },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("RoomService", roomServiceSchema);