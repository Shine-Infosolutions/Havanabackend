const KitchenStore = require('../models/KitchenStore');

// Get all kitchen store items
exports.getItems = async (req, res) => {
  try {
    const items = await KitchenStore.find().sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create kitchen store item
exports.createItem = async (req, res) => {
  try {
    const item = new KitchenStore(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update kitchen store item
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await KitchenStore.findByIdAndUpdate(
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

// Take out items from kitchen store
exports.takeOutItems = async (req, res) => {
  try {
    const { items, notes } = req.body;
    const KitchenConsumption = require('../models/KitchenConsumption');
    
    // Validate items availability
    for (const item of items) {
      const storeItem = await KitchenStore.findOne({ name: item.itemName });
      if (!storeItem) {
        return res.status(400).json({ error: `Item "${item.itemName}" not found` });
      }
      if (storeItem.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient quantity for "${item.itemName}". Available: ${storeItem.quantity}` });
      }
    }
    
    // Create consumption record
    const consumption = new KitchenConsumption({
      items,
      consumedBy: req.user.id,
      notes
    });
    await consumption.save();
    
    // Update kitchen store quantities
    for (const item of items) {
      await KitchenStore.findOneAndUpdate(
        { name: item.itemName },
        { $inc: { quantity: -item.quantity } }
      );
    }
    
    res.json({ message: 'Items taken out successfully', consumption });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create order for out of stock item
exports.createOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await KitchenStore.findById(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const KitchenOrder = require('../models/KitchenOrder');
    const PantryItem = require('../models/PantryItem');
    const PantryOrder = require('../models/PantryOrder');
    
    // Find matching pantry item
    const pantryItem = await PantryItem.findOne({ name: item.name });
    if (!pantryItem) {
      return res.status(400).json({ error: 'Item not found in pantry' });
    }
    
    // Create kitchen order
    const kitchenOrder = new KitchenOrder({
      items: [{
        itemId: pantryItem._id,
        quantity: 10,
        unitPrice: pantryItem.costPerUnit || 10
      }],
      totalAmount: (pantryItem.costPerUnit || 10) * 10,
      orderType: 'kitchen_to_pantry',
      orderedBy: req.user.id,
      specialInstructions: `Urgent: ${item.name} is out of stock in kitchen`
    });
    
    await kitchenOrder.save();
    
    // Create corresponding pantry order
    const pantryOrder = new PantryOrder({
      items: [{
        itemId: pantryItem._id,
        quantity: 10,
        unitPrice: pantryItem.costPerUnit || 10
      }],
      totalAmount: (pantryItem.costPerUnit || 10) * 10,
      orderType: 'Kitchen to Pantry',
      orderedBy: req.user.id,
      specialInstructions: `Kitchen request: ${item.name} is out of stock`,
      kitchenOrderId: kitchenOrder._id
    });
    
    await pantryOrder.save();
    
    res.json({ message: 'Orders created successfully', kitchenOrder, pantryOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete kitchen store item
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await KitchenStore.findByIdAndDelete(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};