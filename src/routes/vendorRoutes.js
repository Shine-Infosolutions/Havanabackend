const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendorController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Get all vendors
router.get("/all", authMiddleware(["admin", "staff", "pantry"]), vendorController.getAllVendors);

// Get single vendor by ID
router.get("/get/:id", authMiddleware(["admin", "staff", "pantry"]), vendorController.getVendorById);

// Create vendor
router.post("/add", authMiddleware(["admin", "staff", "pantry"]), vendorController.createVendor);

// Update vendor
router.put("/update/:id", authMiddleware(["admin", "staff", "pantry"]), vendorController.updateVendor);
router.put("/:id", authMiddleware(["admin", "staff", "pantry"]), vendorController.updateVendor);

// Delete vendor
router.delete("/delete/:id", authMiddleware(["admin"]), vendorController.deleteVendor);
router.delete("/:id", authMiddleware(["admin"]), vendorController.deleteVendor);

module.exports = router;
