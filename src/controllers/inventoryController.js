const { Inventory, StockMovement } = require('../models/Inventory');

// Get all inventory items
exports.getAllItems = async (req, res) => {
  try {
    const items = await Inventory.find().populate('categoryId', 'name').sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get inventory item by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id).populate('categoryId', 'name');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new inventory item
exports.createItem = async (req, res) => {
  try {
    const item = new Inventory(req.body);
    await item.save();
    await item.populate('categoryId', 'name');
    res.status(201).json({ success: true, item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update inventory item
exports.updateItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete inventory item
exports.deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get inventory by category
exports.getByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const items = await Inventory.find({ categoryId }).populate('categoryId', 'name').sort({ name: 1 });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search items
exports.searchItems = async (req, res) => {
  try {
    const { query } = req.query;
    const searchRegex = new RegExp(query, 'i');
    
    const items = await Inventory.find({
      $or: [
        { name: searchRegex },
        { itemCode: searchRegex },
        { description: searchRegex },
        { 'supplier.name': searchRegex }
      ]
    }).populate('categoryId', 'name').sort({ name: 1 });
    
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Stock In/Out operations
exports.stockIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason, notes } = req.body;
    
    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    item.currentStock += parseInt(quantity);
    await item.save();
    
    // Record stock movement
    const movement = new StockMovement({
      itemId: id,
      type: 'stock-in',
      quantity: parseInt(quantity),
      reason: reason || 'Stock replenishment',
      notes: notes || ''
    });
    await movement.save();
    
    res.json({ success: true, item, movement });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.stockOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, issuedTo, reason, notes } = req.body;
    
    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (item.currentStock < parseInt(quantity)) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    item.currentStock -= parseInt(quantity);
    await item.save();
    
    // Record stock movement
    const movement = new StockMovement({
      itemId: id,
      type: 'stock-out',
      quantity: parseInt(quantity),
      issuedTo: issuedTo || '',
      reason: reason || 'Stock issued',
      notes: notes || ''
    });
    await movement.save();
    
    res.json({ success: true, item, movement });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get stock movements
exports.getStockMovements = async (req, res) => {
  try {
    const movements = await StockMovement.find()
      .populate('itemId', 'name itemCode')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, movements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get low stock items
exports.getLowStockItems = async (req, res) => {
  try {
    const items = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    }).populate('categoryId', 'name').sort({ currentStock: 1 });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update stock (reduce quantity)
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    
    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (item.currentStock < parseInt(quantity)) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    item.currentStock -= parseInt(quantity);
    await item.save();
    
    // Record stock movement
    const movement = new StockMovement({
      itemId: id,
      type: 'stock-out',
      quantity: parseInt(quantity),
      reason: 'Room service order',
      notes: 'Stock reduced via room service'
    });
    await movement.save();
    
    res.json({ success: true, item, movement });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};