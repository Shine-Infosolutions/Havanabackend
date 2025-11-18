const Driver  = require("../models/Driver");
const mongoose = require("mongoose");

// ➤ Create Driver
const createDriver = async (req, res) => {
  try {
    const {
      driverName,
      contactNumber,
      licenseNumber,
      licenseExpiry,
      address,
      idProofType,
      idProofNumber,
      driverPhotoUrl,
      notes,
      status
    } = req.body;

    // Basic Validation
    if (!driverName || !contactNumber || !licenseNumber || !licenseExpiry) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const newDriver = await Driver.create({
      driverName,
      contactNumber,
      licenseNumber,
      licenseExpiry,
      address,
      idProofType,
      idProofNumber,
      driverPhotoUrl,
      notes,
      status,
    });

    res.status(201).json({ message: "Driver created successfully", driver: newDriver });
  } catch (error) {
    console.error("Create Driver Error:", error);
    res.status(500).json({ error: "Failed to create driver" });
  }
};

// ➤ Get All Drivers
const getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.status(200).json(drivers);
  } catch (error) {
    console.error("Get Drivers Error:", error);
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
};

// ➤ Get Driver by ID
const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }
    res.status(200).json(driver);
  } catch (error) {
    console.error("Get Driver Error:", error);
    res.status(500).json({ error: "Failed to fetch driver" });
  }
};

// ➤ Update Driver
const updateDriver = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid driver ID" });
      }
  
      // Optional: check for empty body
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "No update data provided" });
      }
  
      // Update
      const updatedDriver = await Driver.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
      );
  
      if (!updatedDriver) {
        return res.status(404).json({ error: "Driver not found" });
      }
  
      return res.status(200).json({
        message: "Driver updated successfully",
        driver: updatedDriver,
      });
    } catch (error) {
      console.error("❌ Driver Update Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };  

// ➤ Delete Driver
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Driver.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Driver not found" });
    }
    res.status(200).json({ message: "Driver deleted" });
  } catch (error) {
    console.error("Delete Driver Error:", error);
    res.status(500).json({ error: "Failed to delete driver" });
  }
};

module.exports = {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver
};
