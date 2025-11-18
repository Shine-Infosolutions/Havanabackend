const express = require("express");
const router = express.Router();
const laundryVendorController = require("../controllers/laundryVendorController");

// Get all vendors
router.get("/", laundryVendorController.getAllVendors);

// Get active vendors only
router.get("/active", laundryVendorController.getActiveVendors);

// Get vendor by ID
router.get("/:id", laundryVendorController.getVendorById);

// Create new vendor
router.post("/", laundryVendorController.createVendor);

// Update vendor
router.put("/:id", laundryVendorController.updateVendor);

// Toggle vendor status
router.patch("/:id/toggle-status", laundryVendorController.toggleVendorStatus);

// Delete vendor
router.delete("/:id", laundryVendorController.deleteVendor);

module.exports = router;