const mongoose = require("mongoose");

const roomInspectionSchema = new mongoose.Schema({
  roomId: {
    type: String
  },

  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
  },

  inspectedBy: {
    type: String
  },

  items: [
    {
      itemName: { type: String },
      status: {
        type: String,
        enum: ["ok", "missing", "damaged", "used"],
        default: "ok"
      },
      charge: {
        type: Number,
        default: 0
      }
    }
  ],

  totalCharge: {
    type: Number,
    default: 0
  },

  remarks: String
}, { timestamps: true });

module.exports = mongoose.model("RoomInspection", roomInspectionSchema);
