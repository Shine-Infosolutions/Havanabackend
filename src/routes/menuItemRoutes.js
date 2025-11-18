const express = require("express");
const router = express.Router();
const {
  getAllMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuByFoodType
} = require("../controllers/menuItemController");

router.get("/", getAllMenuItems);
router.get("/foodtype/:foodType", getMenuByFoodType);

router.post("/", addMenuItem);
router.put("/:id", updateMenuItem);
router.delete("/:id", deleteMenuItem);

module.exports = router;
