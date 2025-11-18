const RoomInventory = require('../models/RoomInventory');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');

// ✅ Assign item to room
exports.assignItemToRoom = async (req, res) => {
  try {
    const { roomId, inventoryId, quantity, userId } = req.body;

    // Validate inputs
    if (!roomId || !inventoryId || !quantity) {
      return res.status(400).json({ message: 'roomId, inventoryId and quantity are required' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number' });
    }

    // Check inventory exists and stock is sufficient
    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) return res.status(404).json({ message: 'Inventory item not found' });

    if (inventory.currentStock < quantity) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }

    // Create RoomInventory record
    const roomInventory = await RoomInventory.create({
      roomId,
      inventoryId,
      quantity
    });

    // Deduct from inventory stock
    const previousStock = inventory.currentStock;
    inventory.currentStock -= quantity;
    await inventory.save();

    // Log the transaction
    await InventoryTransaction.create({
      inventoryId,
      transactionType: 'use',
      quantity,
      previousStock,
      newStock: inventory.currentStock,
      roomId,
      userId,
      notes: 'Assigned to room'
    });

    res.status(201).json({ success: true, roomInventory });
  } catch (error) {
    console.error("AssignItem Error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ✅ Get all items in a room
exports.getRoomInventory = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: 'roomId parameter is required' });
    }

    const inventory = await RoomInventory.find({ roomId }).populate('inventoryId');
    res.status(200).json({ success: true, inventory });
  } catch (error) {
    console.error("GetRoomInventory Error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ✅ Update status (e.g., missing or damaged)
exports.updateItemStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, userId } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const roomInventory = await RoomInventory.findById(id);
    if (!roomInventory) {
      return res.status(404).json({ message: 'Room inventory item not found' });
    }

    // Update status and remarks
    roomInventory.status = status;
    roomInventory.remarks = remarks || '';
    await roomInventory.save();

    // Log adjustment transaction
    const inventory = await Inventory.findById(roomInventory.inventoryId);
    await InventoryTransaction.create({
      inventoryId: roomInventory.inventoryId,
      transactionType: 'adjustment',
      quantity: 0,
      previousStock: inventory ? inventory.currentStock : null,
      newStock: inventory ? inventory.currentStock : null,
      roomId: roomInventory.roomId,
      userId,
      notes: `Marked as ${status}: ${remarks || 'No remarks'}`
    });

    res.status(200).json({ success: true, roomInventory });
  } catch (error) {
    console.error("UpdateRoomInventory Error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ✅ Remove item from room and return to storage
exports.removeItemFromRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Inventory ID is required' });
    }

    const roomInventory = await RoomInventory.findById(id);
    if (!roomInventory) {
      return res.status(404).json({ message: 'Room inventory item not found' });
    }

    const inventory = await Inventory.findById(roomInventory.inventoryId);
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const previousStock = inventory.currentStock;

    // Return stock to inventory
    inventory.currentStock += roomInventory.quantity;
    await inventory.save();

    // Log return transaction
    await InventoryTransaction.create({
      inventoryId: roomInventory.inventoryId,
      transactionType: 'return',
      quantity: roomInventory.quantity,
      previousStock,
      newStock: inventory.currentStock,
      roomId: roomInventory.roomId,
      userId,
      notes: 'Returned from room'
    });

    // Remove room inventory record
    await roomInventory.remove();

    res.status(200).json({ success: true, message: 'Item returned to storage' });
  } catch (error) {
    console.error("RemoveItem Error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
