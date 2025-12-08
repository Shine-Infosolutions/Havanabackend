const Vendor = require("../models/Vendor");

// Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 });
    res.json({ success: true, vendors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single vendor
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create vendor
exports.createVendor = async (req, res) => {
  try {
    const { name, phone, email, address, GSTin, UpiID, scannerImg, isActive } = req.body;
    
    const vendor = new Vendor({
      name,
      phone,
      email,
      address,
      GSTin,
      UpiID,
      scannerImg,
      isActive: isActive !== undefined ? isActive : true
    });
    
    await vendor.save();
    res.status(201).json({ success: true, vendor });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update vendor
exports.updateVendor = async (req, res) => {
  try {
    const { name, phone, email, address, GSTin, UpiID, scannerImg, isActive } = req.body;
    
    const updateData = {
      name,
      phone,
      email,
      address,
      GSTin,
      UpiID,
      scannerImg,
      isActive
    };
    
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete vendor
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }
    res.json({ success: true, message: "Vendor deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
