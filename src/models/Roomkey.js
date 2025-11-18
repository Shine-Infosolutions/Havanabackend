const mongoose = require("mongoose");

const roomKeySchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  rfidUID: { type: String, required: true, unique: true }, 
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 } 
});

module.exports = mongoose.model("RoomKey", roomKeySchema);
