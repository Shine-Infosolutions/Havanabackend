const express = require('express');
const router = express.Router();

const {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  validateCoupon
} = require('../controllers/couponController');

// 🔹 Create new coupon
router.post('/create', createCoupon);

// 🔹 Get all coupons
router.get('/all', getAllCoupons);

// 🔹 Get single coupon by ID
router.get('/get/:id', getCouponById);

// 🔹 Update coupon
router.put('/update/:id', updateCoupon);

//check validate
router.post('/validate', validateCoupon);

// 🔹 Apply coupon (increments timeUsed after checks)
router.post('/apply', applyCoupon);

// 🔹 Delete coupon
router.delete('/delete/:id', deleteCoupon);

module.exports = router;
