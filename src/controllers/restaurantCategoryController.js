const RestaurantCategory = require('../models/RestaurantCategory');

const restaurantCategoryController = {
  getAllCategories: async (req, res) => {
    try {
      const categories = await RestaurantCategory.find();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createCategory: async (req, res) => {
    try {
      const category = new RestaurantCategory(req.body);
      await category.save();
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getCategoryById: async (req, res) => {
    try {
      const category = await RestaurantCategory.findById(req.params.id);
      if (!category) return res.status(404).json({ error: 'Category not found' });
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateCategory: async (req, res) => {
    try {
      const category = await RestaurantCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!category) return res.status(404).json({ error: 'Category not found' });
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const category = await RestaurantCategory.findByIdAndDelete(req.params.id);
      if (!category) return res.status(404).json({ error: 'Category not found' });
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = restaurantCategoryController;