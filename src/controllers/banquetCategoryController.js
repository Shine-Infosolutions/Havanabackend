// controllers/banquetCategoryController.js
const BanquetCategory = require("../models/banquetCategory");

// ✅ Create Category
exports.createCategory = async (req, res) => {
  try {
    const { cateName, status } = req.body;

    if (!cateName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // check duplicate
    const existing = await BanquetCategory.findOne({ cateName: cateName.trim() });
    if (existing) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const category = new BanquetCategory({
      cateName: cateName.trim(),
      status: status || "active",
    });

    await category.save();
    res.status(201).json({ message: "Category created successfully", data: category });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get All Categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await BanquetCategory.find().sort({ createdAt: -1 });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Get Single Category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await BanquetCategory.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Update Category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { cateName, status } = req.body;

    const category = await BanquetCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (cateName) category.cateName = cateName.trim();
    if (status) category.status = status;

    await category.save();
    res.status(200).json({ message: "Category updated successfully", data: category });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ Delete Category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await BanquetCategory.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
