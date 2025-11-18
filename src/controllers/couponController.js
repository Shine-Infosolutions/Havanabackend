const Coupon = require('../models/Coupon');

// 🔹 Create new coupon
exports.createCoupon = async (req, res) => {
  try {
    const { title, code, allowedUses, status = 'active', validTill } = req.body;

    if (!title || !code || !allowedUses || !validTill) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const coupon = new Coupon({
      title,
      code,
      allowedUses,
      status,
      validTill
    });

    await coupon.save();
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Get all coupons
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Get coupon by ID
exports.getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ success: false, error: "Coupon not found" });
    }
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Update a coupon
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Coupon.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: "Coupon not found" });
    }
    res.json({ success: true, coupon: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Apply a coupon count++
exports.applyCoupon = async (req, res) => {
    try {
      const { code } = req.body;
  
      if (!code) {
        return res.status(400).json({ success: false, error: 'Coupon code is required' });
      }
  
      const coupon = await Coupon.findOne({ code });
  
      if (!coupon) {
        return res.status(404).json({ success: false, error: 'Invalid coupon code' });
      }
  
      // Check status
      if (coupon.status !== 'active') {
        return res.status(400).json({ success: false, error: 'Coupon is inactive' });
      }
  
      // Check expiry
      const isExpired = new Date(coupon.validTill) < new Date();
      if (isExpired) {
        return res.status(400).json({ success: false, error: 'Coupon has expired' });
      }
  
      // Check usage limit
      if (coupon.timeUsed >= coupon.allowedUses) {
        return res.status(400).json({ success: false, error: 'Coupon usage limit reached' });
      }
  
      // ✅ Apply coupon → increment timeUsed
      coupon.timeUsed += 1;
      await coupon.save();
  
      res.json({ success: true, message: 'Coupon applied successfully', coupon });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
  
// 🔹 Validate Coupon (without incrementing timeUsed)
exports.validateCoupon = async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, error: "Coupon code is required" });
      }
  
      const coupon = await Coupon.findOne({ code: code.toUpperCase() });
      if (!coupon) {
        return res.status(404).json({ success: false, error: "Invalid coupon code" });
      }
  
      if (coupon.status !== 'active') {
        return res.status(400).json({ success: false, error: "Coupon is inactive" });
      }
  
      if (new Date() > coupon.validTill) {
        return res.status(400).json({ success: false, error: "Coupon has expired" });
      }
  
      if (coupon.timeUsed >= coupon.allowedUses) {
        return res.status(400).json({ success: false, error: "Coupon usage limit reached" });
      }
  
      return res.json({ success: true, valid: true, message: "Coupon is valid", coupon });
  
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  };  

// 🔹 Delete a coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Coupon.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Coupon not found" });
    }
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
