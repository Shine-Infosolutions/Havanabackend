const mongoose = require("mongoose");

const housekeepingSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
  },

  status: {
    type: String,
    enum: ["dirty", "cleaning_in_progress", "clean", "inspected", "out_of_service"],
    default: "clean"
  },

  assignedTo: {
    type: String
  },

  cleaningStartTime: Date,
  cleaningEndTime: Date,

  notes: String,

  updatedBy: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model("Housekeeping", housekeepingSchema);
