const express = require("express");
const {
  getBookingStats,
  getBanquetStats,
  getRestaurantStats,
  getCabStats,
  getLaundryStats
} = require("../controllers/dashboardController");

const router = express.Router();

// Alag-alag endpoints for each module
router.get("/booking", getBookingStats);
router.get("/banquet", getBanquetStats);
router.get("/restaurant", getRestaurantStats);
router.get("/cab", getCabStats);
router.get("/laundry", getLaundryStats);

module.exports = router;
