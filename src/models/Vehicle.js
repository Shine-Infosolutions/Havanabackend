const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["sedan", "suv", "van", "bus", "electric", "other"],
    default: "other",
  },
  brand: String,
  model: String,
  seatingCapacity: Number,

  status: {
    type: String,
    enum: ["active", "under_maintenance", "unavailable"],
    default: "active",
  },

  color: String,
  fuelType: {
    type: String,
    enum: ["petrol", "diesel", "electric", "hybrid"],
    default: "petrol",
  },

  insuranceValidTill: Date,
  registrationExpiry: Date,
  remarks: String,
}, {
  timestamps: true,
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
