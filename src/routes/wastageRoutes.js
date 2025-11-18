const express = require("express");
const router = express.Router();
const {
  createWastage,
  getAllWastage,
  getWastageById,
  updateWastage,
  deleteWastage,
  getWastageStats
} = require("../controllers/wastageController");

// Routes
router.post("/", createWastage);
router.get("/", getAllWastage);
router.get("/stats", getWastageStats);
router.get("/:id", getWastageById);
router.put("/:id", updateWastage);
router.delete("/:id", deleteWastage);

module.exports = router;
