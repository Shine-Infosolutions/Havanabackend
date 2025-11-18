const express = require("express");
const router = express.Router();
const laundryRateController = require("../controllers/laundryRateController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Create a laundry rate
router.post(
  "/add",
  laundryRateController.createLaundryRate
);

// Get all laundry rates
router.get(
  "/all",
  laundryRateController.getLaundryRates
);

// Get single laundry rate by ID
router.get(
  "/:id",
  laundryRateController.getLaundryRateById
);

// Update laundry rate
router.put(
  "/:id",
  laundryRateController.updateLaundryRate
);

// Delete laundry rate
router.delete(
  "/:id",
  laundryRateController.deleteLaundryRate
);

module.exports = router;
