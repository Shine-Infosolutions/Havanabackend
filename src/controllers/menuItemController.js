const MenuItem = require("../models/MenuItem");

// Get all menu items
exports.getAllMenuItems = async (req, res) => {
  try {
    const { foodType, category } = req.query;
    let filter = { isActive: true };
    
    if (foodType) {
      filter.$or = [
        { foodType: { $in: [foodType, "Both"] } },
        { type: { $in: [foodType, "Both"] } }
      ];
    }
    if (category) filter.category = category;
    
    const items = await MenuItem.find(filter).populate('category').sort({ category: 1, name: 1 });
    
    // Transform items to show category name instead of ObjectId
    const transformedItems = items.map(item => ({
      ...item.toObject(),
      category: item.category?.cateName || item.category?.name || item.category?.toString() || item.category,
      foodType: item.foodType || item.type
    }));
    res.json({ success: true, data: transformedItems });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Add new menu item
exports.addMenuItem = async (req, res) => {
  try {
    const { name, category, foodType } = req.body;
    
    const existingItem = await MenuItem.findOne({ name, category });
    if (existingItem) {
      return res.status(400).json({ success: false, message: "Item already exists in this category" });
    }
    
    const menuItem = new MenuItem({ name, category, foodType });
    await menuItem.save();
    
    res.status(201).json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const menuItem = await MenuItem.findByIdAndUpdate(id, updates, { new: true });
    if (!menuItem) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }
    
    res.json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const menuItem = await MenuItem.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!menuItem) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }
    
    res.json({ success: true, message: "Menu item deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get menu items grouped by category
exports.getMenuByFoodType = async (req, res) => {
  try {
    const { foodType } = req.params;
    
    // Handle both 'foodType' and 'type' fields, and both 'Veg'/'NonVeg' and 'Non-Veg' values
    const normalizedFoodType = foodType.toLowerCase();
    const typeQuery = normalizedFoodType.includes('non') ? ['NonVeg', 'Non-Veg', 'Both'] : ['Veg', 'Both'];
    
    const items = await MenuItem.find({
      isActive: true,
      $or: [
        { foodType: { $in: typeQuery } },
        { type: { $in: typeQuery } }
      ]
    }).populate('category').sort({ category: 1, name: 1 });
    
    const groupedMenu = items.reduce((acc, item) => {
      // Handle both string category and ObjectId category
      let categoryName;
      if (typeof item.category === 'string') {
        categoryName = item.category;
      } else if (item.category?.cateName) {
        categoryName = item.category.cateName;
      } else if (item.category?.name) {
        categoryName = item.category.name;
      } else {
        categoryName = item.category?.toString() || 'UNCATEGORIZED';
      }
      
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(item.name);
      return acc;
    }, {});
    
    res.json({ success: true, data: groupedMenu });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};