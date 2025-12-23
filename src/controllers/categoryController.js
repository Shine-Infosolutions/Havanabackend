const Category = require('../models/Category.js');

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const category = new Category({ name, description, status });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .maxTimeMS(5000)
      .lean()
      .exec();
    res.json(categories);
  } catch (error) {
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      res.status(408).json({ error: 'Database query timeout. Please try again.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// Get all categories with room counts
exports.getCategoriesWithRooms = async (req, res) => {
  try {
    const Room = require('../models/Room');
    
    const [categories, rooms] = await Promise.all([
      Category.find().maxTimeMS(5000).lean().exec(),
      Room.find().maxTimeMS(5000).lean().exec()
    ]);
    
    // Add room counts to categories
    const categoriesWithCounts = categories.map(category => ({
      ...category,
      totalRooms: rooms.filter(room => {
        return room.categoryId === category._id || room.category?._id === category._id;
      }).length,
      availableRoomsCount: 0, // Will be updated after availability check
    }));
    
    res.json({
      categories: categoriesWithCounts,
      rooms: rooms
    });
  } catch (error) {
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      res.status(408).json({ error: 'Database query timeout. Please try again.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// Get a category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, status },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};