const Vehicle = require("../models/Vehicle");

// ── Add a new vehicle ─────────────────────────────────────────────
exports.addVehicle = async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.status(201).json({ success: true, vehicle });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ── Get all vehicles ──────────────────────────────────────────────
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json({ success: true, vehicles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Get single vehicle by ID ──────────────────────────────────────
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found" });
    }
    res.json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Update vehicle ────────────────────────────────────────────────
exports.updateVehicle = async (req, res) => {
  try {
    const updated = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: "Vehicle not found" });
    }
    res.json({ success: true, vehicle: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ── Get vehicle by vehicle number ─────────────────────────────────
exports.getVehicleByNumber = async (req, res) => {
  try {
    const { number } = req.params;

    const vehicle = await Vehicle.findOne({ vehicleNumber: number });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: "Vehicle not found" });
    }

    res.json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Delete vehicle ────────────────────────────────────────────────
exports.deleteVehicle = async (req, res) => {
  try {
    const deleted = await Vehicle.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Vehicle not found" });
    }
    res.json({ success: true, message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
