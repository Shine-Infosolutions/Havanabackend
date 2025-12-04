const InventoryCategory = require('../models/InventoryCategory.js');

// Create a new inventory category
exports.createInventoryCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const inventoryCategory = new InventoryCategory({ name, description, isActive });
    await inventoryCategory.save();
    res.status(201).json(inventoryCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all inventory categories
exports.getInventoryCategories = async (req, res) => {
  try {
    const inventoryCategories = await InventoryCategory.find()
      .maxTimeMS(5000)
      .lean()
      .exec();
    res.json(inventoryCategories);
  } catch (error) {
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      res.status(408).json({ error: 'Database query timeout. Please try again.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// Get an inventory category by ID
exports.getInventoryCategoryById = async (req, res) => {
  try {
    const inventoryCategory = await InventoryCategory.findById(req.params.id);
    if (!inventoryCategory) return res.status(404).json({ error: 'Inventory category not found' });
    res.json(inventoryCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an inventory category
exports.updateInventoryCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const inventoryCategory = await InventoryCategory.findByIdAndUpdate(
      req.params.id,
      { name, description, isActive },
      { new: true, runValidators: true }
    );
    if (!inventoryCategory) return res.status(404).json({ error: 'Inventory category not found' });
    res.json(inventoryCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete an inventory category
exports.deleteInventoryCategory = async (req, res) => {
  try {
    const inventoryCategory = await InventoryCategory.findByIdAndDelete(req.params.id);
    if (!inventoryCategory) return res.status(404).json({ error: 'Inventory category not found' });
    res.json({ message: 'Inventory category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};