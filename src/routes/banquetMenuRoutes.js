const express = require("express");
const router = express.Router();
const {
getMenuByBookingId,getMenuByCustomerRef,updateMenuByCustomerRef,createMenu} = require("../controllers/banquetmenuController");

router.post("/create", createMenu);
router.get("/:bookingId", getMenuByBookingId);
router.get("/all/:customerRef",getMenuByCustomerRef)
router.put("/update/:customerRef",updateMenuByCustomerRef)
module.exports = router;
