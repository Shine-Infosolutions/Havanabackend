const PantryCategory = require('../models/PantryCategory');

// ➕ Add new category
const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: 'Category name is required' });

    // Check if category already exists
    const existing = await PantryCategory.findOne({ name: name.trim() });
    if (existing) return res.status(400).json({ message: 'Category already exists' });

    const category = await PantryCategory.create({ name: name.trim(), description });
    res.status(201).json({ message: 'Category added successfully', category });
  } catch (err) {
    console.error('Error adding category:', err);
    res.status(500).json({ message: 'Server error while adding category' });
  }
};

// 📋 Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await PantryCategory.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
};

// ✏️ Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await PantryCategory.findById(id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    res.status(200).json({ message: 'Category updated successfully', category });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Server error while updating category' });
  }
};

// 🗑 Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: check if any pantry items exist with this category
    const PantryItem = require('../models/PantryItem');
    const items = await PantryItem.findOne({ category: id });
    if (items) return res.status(400).json({ message: 'Cannot delete category with existing pantry items' });

    await PantryCategory.findByIdAndDelete(id);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Server error while deleting category' });
  }
};

module.exports = {
  addCategory,
  getAllCategories,
  updateCategory,
  deleteCategory
};
