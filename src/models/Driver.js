const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    // ➤ Driver Info
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    licenseExpiry: {
      type: Date,
      required: true,
    },
    address: {
      type: String,
      default: "",
    },
    idProofType: {
      type: String,
      enum: ["AADHAAR", "DL", "VOTER_ID", "PASSPORT", "PAN", "OTHER"],
      default: "AADHAAR",
    },
    idProofNumber: {
      type: String,
      trim: true,
    },
    driverPhotoUrl: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    // ➤ Driver status
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ON_TRIP", "UNAVAILABLE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

const Driver = mongoose.model("Driver", driverSchema);
module.exports = Driver;

