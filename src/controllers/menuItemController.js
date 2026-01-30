const MenuItem = require("../models/MenuItem");
const { createAuditLog } = require('../utils/auditLogger');

// Get all menu items
exports.getAllMenuItems = async (req, res) => {
  try {
    const { foodType, category } = req.query;
    let filter = { isActive: true };
    
    if (foodType) {
      filter.foodType = { $in: [foodType, "Both"] };
    }
    if (category) filter.category = category;
    
    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, menuItems: items, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add new menu item
exports.addMenuItem = async (req, res) => {
  try {
    const { name, Price, category, Discount, foodType, isActive, description, timeToPrepare, image } = req.body;
    
    const existingItem = await MenuItem.findOne({ name, category });
    if (existingItem) {
      return res.status(400).json({ success: false, message: "Item already exists in this category" });
    }
    
    const menuItem = new MenuItem({ 
      name, 
      Price, 
      category, 
      Discount, 
      foodType, 
      isActive, 
      description, 
      timeToPrepare, 
      image 
    });
    await menuItem.save();
    
    // Create audit log
    createAuditLog('CREATE', 'MENU_ITEM', menuItem._id, req.user?.id, req.user?.role, null, menuItem.toObject(), req);
    
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
    
    // Get original data for audit log
    const originalMenuItem = await MenuItem.findById(id);
    if (!originalMenuItem) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }
    
    const menuItem = await MenuItem.findByIdAndUpdate(id, updates, { new: true });
    
    // Create audit log
    createAuditLog('UPDATE', 'MENU_ITEM', menuItem._id, req.user?.id, req.user?.role, originalMenuItem.toObject(), menuItem.toObject(), req);
    
    res.json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get original data for audit log
    const originalMenuItem = await MenuItem.findById(id);
    if (!originalMenuItem) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }
  
    const menuItem = await MenuItem.findByIdAndUpdate(id, { isActive: false }, { new: true });
    
    // Create audit log
    createAuditLog('DELETE', 'MENU_ITEM', menuItem._id, req.user?.id, req.user?.role, originalMenuItem.toObject(), menuItem.toObject(), req);
    
    res.json({ success: true, message: "Menu item deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get menu items grouped by category
exports.getMenuByFoodType = async (req, res) => {
  try {
    const { foodType } = req.params;
    
    const normalizedFoodType = foodType.toLowerCase();
    const typeQuery = normalizedFoodType.includes('non') ? ['NonVeg', 'Non-Veg', 'Both'] : ['Veg', 'Both'];
    
    const items = await MenuItem.find({
      isActive: true,
      foodType: { $in: typeQuery }
    }).sort({ category: 1, name: 1 });
    
    const groupedMenu = items.reduce((acc, item) => {
      const categoryName = item.category || 'UNCATEGORIZED';
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(item.name);
      return acc;
    }, {});
    
    res.json({ success: true, data: groupedMenu });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};