const { Inventory, StockMovement } = require('../models/Inventory');
const { getAuditLogModel } = require('../models/AuditLogModel');
const mongoose = require('mongoose');

// Helper function to create audit log (non-blocking)
const createAuditLog = (action, recordId, userId, userRole, oldData, newData, req) => {
  // Run asynchronously without blocking main operation
  setImmediate(async () => {
    try {
      const AuditLog = await getAuditLogModel();
      await AuditLog.create({
        action,
        module: 'INVENTORY',
        recordId,
        userId: userId || new mongoose.Types.ObjectId(),
        userRole: userRole || 'SYSTEM',
        oldData,
        newData,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
      });
      console.log(`✅ Audit log created: ${action} for inventory ${recordId}`);
    } catch (error) {
      console.error('❌ Audit log creation failed:', error);
    }
  });
};

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

    // Create audit log
    await createAuditLog('CREATE', item._id, req.user?.id, req.user?.role, null, item.toObject(), req);

    res.status(201).json({ success: true, item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update inventory item
exports.updateItem = async (req, res) => {
  try {
    // Get original data for audit log
    const originalItem = await Inventory.findById(req.params.id);
    if (!originalItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name');

    // Create audit log
    await createAuditLog('UPDATE', item._id, req.user?.id, req.user?.role, originalItem.toObject(), item.toObject(), req);

    res.json({ success: true, item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete inventory item
exports.deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Create audit log
    await createAuditLog('DELETE', item._id, req.user?.id, req.user?.role, item.toObject(), null, req);

    await Inventory.findByIdAndDelete(req.params.id);
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
    
    // Create audit log for stock in
    await createAuditLog('UPDATE', item._id, req.user?.id, req.user?.role, 
      { currentStock: item.currentStock - parseInt(quantity) }, 
      { currentStock: item.currentStock, stockMovement: movement.toObject() }, req);
    
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
    
    // Create audit log for stock out
    await createAuditLog('UPDATE', item._id, req.user?.id, req.user?.role, 
      { currentStock: item.currentStock + parseInt(quantity) }, 
      { currentStock: item.currentStock, stockMovement: movement.toObject() }, req);
    
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
    
    // Create audit log for stock update
    await createAuditLog('UPDATE', item._id, req.user?.id, req.user?.role, 
      { currentStock: item.currentStock + parseInt(quantity) }, 
      { currentStock: item.currentStock, stockMovement: movement.toObject() }, req);
    
    res.json({ success: true, item, movement });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};