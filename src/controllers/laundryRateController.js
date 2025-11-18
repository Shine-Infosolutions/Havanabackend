// controllers/laundryRateController.js
const LaundryRate = require("../models/LaundryRate");

// Create a new laundry rate
exports.createLaundryRate = async (req, res) => {
  try {
    const rate = await LaundryRate.create(req.body);
    res.status(201).json(rate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get all laundry rates
exports.getLaundryRates = async (req, res) => {
  try {
    const rates = await LaundryRate.find({ isActive: true });
    res.json(rates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a single rate
exports.getLaundryRateById = async (req, res) => {
  try {
    const rate = await LaundryRate.findById(req.params.id);
    if (!rate) return res.status(404).json({ message: "Laundry rate not found" });
    res.json(rate);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update rate
exports.updateLaundryRate = async (req, res) => {
  try {
    const rate = await LaundryRate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rate) return res.status(404).json({ message: "Laundry rate not found" });
    res.json(rate);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Soft delete (Deactivate)
exports.deleteLaundryRate = async (req, res) => {
  try {
    const rate = await LaundryRate.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!rate) return res.status(404).json({ message: "Laundry rate not found" });
    res.json({ message: "Laundry rate deactivated", rate });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
