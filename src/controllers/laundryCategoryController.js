const LaundryCategory = require('../models/LaundryCategory');
const { createAuditLog } = require('../utils/auditLogger');

// Create Category
exports.createCategory = async (req, res) => {
  try {
    const category = await LaundryCategory.create(req.body);
    
    // Create audit log
    createAuditLog('CREATE', 'LAUNDRY_CATEGORY', category._id, req.user?.id, req.user?.role, null, category.toObject(), req);
    
    res.status(201).json({ success: true, category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get All Categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await LaundryCategory.find({ isActive: true }).sort({ categoryName: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await LaundryCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Category
exports.updateCategory = async (req, res) => {
  try {
    // Get original data for audit log
    const originalCategory = await LaundryCategory.findById(req.params.id);
    if (!originalCategory) return res.status(404).json({ error: 'Category not found' });
    
    const category = await LaundryCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    
    // Create audit log
    createAuditLog('UPDATE', 'LAUNDRY_CATEGORY', category._id, req.user?.id, req.user?.role, originalCategory.toObject(), category.toObject(), req);
    
    res.json({ success: true, category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
  try {
    // Get original data for audit log
    const originalCategory = await LaundryCategory.findById(req.params.id);
    if (!originalCategory) return res.status(404).json({ error: 'Category not found' });
    
    const category = await LaundryCategory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    
    // Create audit log
    createAuditLog('DELETE', 'LAUNDRY_CATEGORY', category._id, req.user?.id, req.user?.role, originalCategory.toObject(), category.toObject(), req);
    
    res.json({ success: true, message: 'Category deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};