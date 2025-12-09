const LaundryCategory = require('../models/LaundryCategory');

// Create Category
exports.createCategory = async (req, res) => {
  try {
    const category = await LaundryCategory.create(req.body);
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
    const category = await LaundryCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ success: true, category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await LaundryCategory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ success: true, message: 'Category deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};