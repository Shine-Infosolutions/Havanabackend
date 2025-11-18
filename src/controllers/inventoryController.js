const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const RoomInventoryChecklist = require('../models/RoomInventoryChecklist');

// Get all inventory items
exports.getItems = async (req, res) => {
  try {
    const items = await Inventory.find().sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create inventory item
exports.createItem = async (req, res) => {
  try {
    const item = new Inventory(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update inventory item
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Inventory.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete inventory item
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Inventory.findByIdAndDelete(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all transactions
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await InventoryTransaction.find()
      .populate('inventoryId', 'name')
      .populate('userId', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create transaction
exports.createTransaction = async (req, res) => {
  try {
    const { inventoryId, transactionType, quantity, reason, roomNumber } = req.body;
    
    // Get current stock before transaction
    const item = await Inventory.findById(inventoryId);
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    const previousStock = item.currentStock;
    let newStock;
    
    // Calculate new stock based on transaction type
    if (transactionType === 'restock' || transactionType === 'return') {
      newStock = previousStock + parseInt(quantity);
    } else if (transactionType === 'use' || transactionType === 'transfer') {
      newStock = previousStock - parseInt(quantity);
    } else if (transactionType === 'adjustment') {
      newStock = parseInt(quantity);
    }
    
    const transaction = new InventoryTransaction({
      inventoryId,
      transactionType,
      quantity,
      reason,
      roomNumber,
      previousStock,
      newStock,
      userId: req.user.id
    });
    
    await transaction.save();
    
    // Update inventory stock
    item.currentStock = newStock;
    await item.save();
    
    res.status(201).json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get transaction history for specific inventory item
exports.getTransactionHistory = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    
    const transactions = await InventoryTransaction.find({ inventoryId })
      .populate('userId', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get room inventory checklist
exports.getRoomChecklist = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { taskId } = req.query;
    
    console.log('Fetching checklist for roomId:', roomId, 'taskId:', taskId);
    
    const checklist = await RoomInventoryChecklist.findOne({ 
      roomId, 
      housekeepingTaskId: taskId 
    }).populate('items.inventoryId', 'name category');
    
    if (!checklist || checklist.items.length === 0) {
      // Get all inventory items when no checklist exists or checklist is empty
      const allInventory = await Inventory.find({}).sort({ name: 1 });
      
      // Get unique items only (one per item name, ignore stock quantity)
      const uniqueItems = [];
      const seenNames = new Set();
      
      for (const item of allInventory) {
        if (!seenNames.has(item.name)) {
          seenNames.add(item.name);
          uniqueItems.push({
            _id: item._id,
            name: item.name,
            category: item.category
          });
        }
      }
      
      return res.json({ items: uniqueItems, checklist: null });
    }
    
    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Error in getRoomChecklist:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create room inventory checklist
exports.createRoomChecklist = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { housekeepingTaskId, items } = req.body;
    
    const checklist = new RoomInventoryChecklist({
      housekeepingTaskId,
      roomId,
      checkedBy: req.user.id,
      items
    });
    
    await checklist.save();
    res.status(201).json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update checklist
exports.updateChecklist = async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { items, status } = req.body;
    
    const updateData = { items };
    if (status === 'completed') {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }
    
    const checklist = await RoomInventoryChecklist.findByIdAndUpdate(
      checklistId, 
      updateData, 
      { new: true }
    );
    
    res.json(checklist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};