const PurchaseOrder = require('../models/PurchaseOrder');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');

// Create purchase order
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, items, expectedDelivery, notes } = req.body;
    
    // Calculate total amount
    let totalAmount = 0;
    const processedItems = items.map(item => {
      const totalPrice = item.quantity * item.unitPrice;
      totalAmount += totalPrice;
      return { ...item, totalPrice };
    });
    
    // Generate PO number
    const count = await PurchaseOrder.countDocuments();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    
    const purchaseOrder = new PurchaseOrder({
      poNumber,
      supplier,
      items: processedItems,
      totalAmount,
      expectedDelivery,
      notes,
      createdBy: req.user.id
    });
    
    await purchaseOrder.save();
    await purchaseOrder.populate('items.inventoryId', 'name unit');
    
    res.status(201).json({ success: true, purchaseOrder });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all purchase orders
exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const orders = await PurchaseOrder.find(filter)
      .populate('items.inventoryId', 'name unit')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update purchase order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, actualDelivery } = req.body;
    
    const order = await PurchaseOrder.findByIdAndUpdate(
      orderId,
      { status, ...(actualDelivery && { actualDelivery }) },
      { new: true }
    ).populate('items.inventoryId', 'name unit');
    
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Receive purchase order (update inventory)
exports.receivePurchaseOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { receivedItems } = req.body; // Array of {inventoryId, receivedQuantity}
    
    const order = await PurchaseOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    // Update inventory and create transactions
    for (const receivedItem of receivedItems) {
      const inventory = await Inventory.findById(receivedItem.inventoryId);
      const previousStock = inventory.currentStock;
      const newStock = previousStock + receivedItem.receivedQuantity;
      
      // Update inventory
      inventory.currentStock = newStock;
      inventory.lastReorderDate = new Date();
      await inventory.save();
      
      // Create transaction
      await new InventoryTransaction({
        inventoryId: receivedItem.inventoryId,
        transactionType: 'restock',
        quantity: receivedItem.receivedQuantity,
        previousStock,
        newStock,
        userId: req.user.id,
        notes: `PO Received: ${order.poNumber}`,
        purchaseOrderId: order.poNumber
      }).save();
    }
    
    // Update order status
    order.status = 'received';
    order.actualDelivery = new Date();
    await order.save();
    
    res.json({ success: true, message: 'Purchase order received and inventory updated' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get low stock items for reordering
exports.getLowStockItems = async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$minThreshold'] }
    }).select('name currentStock minThreshold reorderQuantity unit costPerUnit supplier');
    
    res.json({ success: true, items: lowStockItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};