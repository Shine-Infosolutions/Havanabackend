const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");

// Create
router.post("/add", driverController.createDriver);

// Read
router.get("/", driverController.getAllDrivers);
router.get("/:id", driverController.getDriverById);

// Update
router.put("/:id", driverController.updateDriver);

// Delete
router.delete("/:id", driverController.deleteDriver);

module.exports = router;
