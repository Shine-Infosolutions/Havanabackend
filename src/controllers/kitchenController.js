const KitchenOrder = require('../models/KitchenOrder');

// Get all kitchen orders
const getAllKitchenOrders = async (req, res) => {
  try {
    const orders = await KitchenOrder.find()
      .populate('items.itemId', 'name unit')
      .populate('vendorId', 'name')
      .populate('fulfillment.fulfilledBy', 'name');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get kitchen order by ID
const getKitchenOrderById = async (req, res) => {
  try {
    const order = await KitchenOrder.findById(req.params.id)
      .populate('items.itemId', 'name unit')
      .populate('vendorId', 'name')
      .populate('fulfillment.fulfilledBy', 'name');
    if (!order) {
      return res.status(404).json({ message: 'Kitchen order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new kitchen order
const createKitchenOrder = async (req, res) => {
  try {
    const order = new KitchenOrder(req.body);
    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update kitchen order
const updateKitchenOrder = async (req, res) => {
  try {
    console.log(`Updating kitchen order ${req.params.id} with:`, req.body);
    
    const order = await KitchenOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ message: 'Kitchen order not found' });
    }

    console.log(`Kitchen order updated:`, {
      id: order._id,
      orderType: order.orderType,
      status: order.status,
      pantryOrderId: order.pantryOrderId
    });

    // Sync pantry order status when kitchen order status changes
    if (order.orderType === 'pantry_to_kitchen' && req.body.status) {
      console.log(`Attempting to sync pantry order for kitchen order ${order._id}`);
      try {
        const PantryOrder = require('../models/PantryOrder');
        let pantryStatus = req.body.status;
        
        // Map kitchen status to appropriate pantry status
        if (req.body.status === 'approved') {
          pantryStatus = 'approved'; // Pantry can now send items
        } else if (req.body.status === 'preparing') {
          pantryStatus = 'delivered'; // Items have been sent to kitchen
        } else if (req.body.status === 'ready') {
          pantryStatus = 'ready'; // Kitchen has prepared the items
        }
        
        console.log(`Mapped kitchen status '${req.body.status}' to pantry status '${pantryStatus}'`);
        
        // Try to find pantry order by pantryOrderId first
        let updatedPantryOrder = null;
        if (order.pantryOrderId) {
          console.log(`Looking for pantry order by pantryOrderId: ${order.pantryOrderId}`);
          try {
            // Ensure proper ObjectId conversion
            const mongoose = require('mongoose');
            const pantryOrderId = mongoose.Types.ObjectId.isValid(order.pantryOrderId) 
              ? order.pantryOrderId 
              : new mongoose.Types.ObjectId(order.pantryOrderId);
            
            updatedPantryOrder = await PantryOrder.findByIdAndUpdate(
              pantryOrderId, 
              { status: pantryStatus },
              { new: true }
            );
            console.log(`Found pantry order by pantryOrderId:`, updatedPantryOrder ? 'SUCCESS' : 'NOT FOUND');
          } catch (err) {
            console.error(`Error finding pantry order by pantryOrderId:`, err.message);
          }
        }
        
        // If not found by pantryOrderId, try to find by kitchenOrderId
        if (!updatedPantryOrder) {
          console.log(`Looking for pantry order by kitchenOrderId: ${order._id}`);
          try {
            updatedPantryOrder = await PantryOrder.findOneAndUpdate(
              { kitchenOrderId: order._id },
              { status: pantryStatus },
              { new: true }
            );
            console.log(`Found pantry order by kitchenOrderId:`, updatedPantryOrder ? 'SUCCESS' : 'NOT FOUND');
          } catch (err) {
            console.error(`Error finding pantry order by kitchenOrderId:`, err.message);
          }
        }
        
        if (updatedPantryOrder) {
          console.log(`SUCCESS: Pantry order ${updatedPantryOrder._id} status updated to: ${pantryStatus}`);
        } else {
          console.log(`ERROR: No pantry order found for kitchen order ${order._id}`);
          console.log(`Kitchen order details:`, {
            id: order._id,
            pantryOrderId: order.pantryOrderId,
            orderType: order.orderType
          });
        }
      } catch (pantryError) {
        console.error('Failed to update pantry order status:', pantryError.message);
      }
    } else {
      console.log(`Skipping pantry sync - orderType: ${order.orderType}, status: ${req.body.status}`);
    }

    res.json(order);
  } catch (error) {
    console.error('Kitchen order update error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete kitchen order
const deleteKitchenOrder = async (req, res) => {
  try {
    const order = await KitchenOrder.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Kitchen order not found' });
    }
    res.json({ message: 'Kitchen order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Manual sync endpoint for testing
const syncPantryOrder = async (req, res) => {
  try {
    const { kitchenOrderId, status } = req.body;
    
    const kitchenOrder = await KitchenOrder.findById(kitchenOrderId);
    if (!kitchenOrder) {
      return res.status(404).json({ message: 'Kitchen order not found' });
    }
    
    const PantryOrder = require('../models/PantryOrder');
    const updatedPantryOrder = await PantryOrder.findByIdAndUpdate(
      kitchenOrder.pantryOrderId,
      { status: status },
      { new: true }
    );
    
    if (updatedPantryOrder) {
      res.json({ success: true, message: 'Pantry order synced', pantryOrder: updatedPantryOrder });
    } else {
      res.status(404).json({ message: 'Pantry order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllKitchenOrders,
  getKitchenOrderById,
  createKitchenOrder,
  updateKitchenOrder,
  deleteKitchenOrder,
  syncPantryOrder
};