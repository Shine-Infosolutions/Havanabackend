const KitchenOrder = require('../models/KitchenOrder');

// Get all kitchen orders with pagination and filtering
const getAllKitchenOrders = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, orderType, legacy } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (orderType) filter.orderType = orderType;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await KitchenOrder.find(filter)
      .select('items totalAmount status orderType specialInstructions orderedBy createdAt receivedAt pantryOrderId')
      .populate('items.itemId', 'name unit')
      .populate('vendorId', 'name')
      .populate('orderedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
      
    // For backward compatibility, return just orders array if legacy=true
    if (legacy === 'true') {
      return res.json(orders);
    }
      
    const total = await KitchenOrder.countDocuments(filter);
    
    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Kitchen orders fetch error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get kitchen order by ID
const getKitchenOrderById = async (req, res) => {
  try {
    const order = await KitchenOrder.findById(req.params.id)
      .populate('items.itemId', 'name unit')
      .populate('vendorId', 'name')
      .populate('orderedBy', 'username email')
      .lean();
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
    const orderData = {
      ...req.body,
      orderedBy: req.user?.id || req.body.orderedBy
    };
    
    const order = new KitchenOrder(orderData);
    const savedOrder = await order.save();
    
    // If kitchen to pantry order, create corresponding pantry order
    if (req.body.orderType === 'kitchen_to_pantry') {
      try {
        const PantryOrder = require('../models/PantryOrder');
        
        console.log('Creating pantry order for kitchen order:', savedOrder._id);
        
        const pantryOrder = new PantryOrder({
          items: savedOrder.items.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0
          })),
          totalAmount: savedOrder.totalAmount,
          orderType: 'Kitchen to Pantry',
          specialInstructions: savedOrder.specialInstructions || `Order from kitchen: ${savedOrder._id}`,
          orderedBy: savedOrder.orderedBy,
          kitchenOrderId: savedOrder._id,
          status: 'pending'
        });
        
        const savedPantryOrder = await pantryOrder.save();
        console.log('Pantry order created successfully:', savedPantryOrder._id);
        
        // Link pantry order back to kitchen order
        savedOrder.pantryOrderId = savedPantryOrder._id;
        await savedOrder.save();
        console.log('Kitchen order updated with pantry order link');
      } catch (error) {
        console.error('Failed to create pantry order:', error);
        console.error('Pantry order creation error stack:', error.stack);
      }
    }
    
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update kitchen order
const updateKitchenOrder = async (req, res) => {
  try {
    // Set receivedAt timestamp when status is 'delivered'
    const updateData = { ...req.body };
    if (req.body.status === 'delivered') {
      updateData.receivedAt = new Date();
    }
    
    const order = await KitchenOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('items.itemId', 'name unit');
    if (!order) {
      return res.status(404).json({ message: 'Kitchen order not found' });
    }

    // Update kitchen store and pantry stock when items are received from pantry
    if (req.body.status === 'delivered' && (order.orderType === 'kitchen_to_pantry' || order.orderType === 'pantry_to_kitchen') && order.items && order.items.length > 0) {
      try {
        const KitchenStore = require('../models/KitchenStore');
        const PantryItem = require('../models/PantryItem');
        
        console.log(`Updating kitchen store and pantry stock for ${order.orderType} order:`, order._id);
        
        for (const orderItem of order.items) {
          const itemName = orderItem.itemId?.name || orderItem.name;
          const itemUnit = orderItem.itemId?.unit || orderItem.unit || 'pcs';
          const itemQuantity = Number(orderItem.quantity);
          
          if (!itemName || itemQuantity <= 0) {
            console.log('Skipping invalid item:', orderItem);
            continue;
          }
          
          // Reduce pantry stock (pantry sends items to kitchen)
          const pantryItem = await PantryItem.findOne({ name: itemName });
          if (pantryItem && pantryItem.stockQuantity >= itemQuantity) {
            const oldPantryStock = pantryItem.stockQuantity;
            pantryItem.stockQuantity -= itemQuantity;
            await pantryItem.save();
            console.log(`Reduced pantry stock: ${itemName} ${oldPantryStock} - ${itemQuantity} = ${pantryItem.stockQuantity}`);
          } else {
            console.log(`Warning: Insufficient pantry stock for ${itemName}. Available: ${pantryItem?.stockQuantity || 0}, Required: ${itemQuantity}`);
          }
          
          // Add to kitchen store
          let kitchenItem = await KitchenStore.findOne({ 
            name: itemName 
          });
          
          if (kitchenItem) {
            const oldQuantity = Number(kitchenItem.quantity);
            kitchenItem.quantity = oldQuantity + itemQuantity;
            await kitchenItem.save();
            console.log(`Updated kitchen store: ${itemName} ${oldQuantity} + ${itemQuantity} = ${kitchenItem.quantity} ${itemUnit}`);
          } else {
            kitchenItem = new KitchenStore({
              name: itemName,
              category: 'Food',
              quantity: itemQuantity,
              unit: itemUnit
            });
            await kitchenItem.save();
            console.log(`Created new kitchen store item: ${itemName} with ${itemQuantity} ${itemUnit}`);
          }
        }
        console.log('Kitchen store and pantry stock update completed successfully');
      } catch (kitchenStoreError) {
        console.error('Failed to update kitchen store and pantry stock:', kitchenStoreError.message);
        console.error('Kitchen store error stack:', kitchenStoreError.stack);
      }
    }

    // Sync pantry order status when kitchen order status changes
    if (order.orderType === 'pantry_to_kitchen' && order.pantryOrderId && req.body.status) {
      try {
        const PantryOrder = require('../models/PantryOrder');
        let pantryStatus = req.body.status;
        
        // Map kitchen status to appropriate pantry status
        if (req.body.status === 'approved') {
          pantryStatus = 'approved';
        } else if (req.body.status === 'delivered') {
          pantryStatus = 'delivered'; // Kitchen received the items
        } else if (req.body.status === 'preparing') {
          pantryStatus = 'preparing';
        } else if (req.body.status === 'ready') {
          pantryStatus = 'ready';
        }
        
        const updatedPantryOrder = await PantryOrder.findByIdAndUpdate(
          order.pantryOrderId,
          { status: pantryStatus },
          { new: true }
        );
        
        if (updatedPantryOrder) {
          console.log(`Pantry order ${updatedPantryOrder._id} status updated to: ${pantryStatus}`);
        } else {
          console.log(`Pantry order ${order.pantryOrderId} not found`);
        }
      } catch (pantryError) {
        console.error('Failed to update pantry order status:', pantryError.message);
      }
    }

    res.json(order);
  } catch (error) {
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

// Sync missing kitchen orders from pantry orders
const syncMissingKitchenOrders = async (req, res) => {
  try {
    const PantryOrder = require('../models/PantryOrder');
    
    // Find Kitchen to Pantry orders that are approved but don't have linked kitchen orders
    const pantryOrders = await PantryOrder.find({
      orderType: 'Kitchen to Pantry',
      status: { $in: ['approved', 'fulfilled'] },
      kitchenOrderId: { $exists: false }
    }).populate('items.itemId', 'name unit');
    
    console.log('Found pantry orders without kitchen orders:', pantryOrders.length);
    
    const createdOrders = [];
    
    for (const pantryOrder of pantryOrders) {
      const kitchenOrder = new KitchenOrder({
        items: pantryOrder.items,
        totalAmount: pantryOrder.totalAmount,
        status: pantryOrder.status === 'approved' ? 'delivered' : 'approved',
        orderType: 'kitchen_to_pantry',
        specialInstructions: pantryOrder.specialInstructions || `Synced from pantry order ${pantryOrder._id}`,
        orderedBy: pantryOrder.orderedBy,
        pantryOrderId: pantryOrder._id
      });
      
      const savedKitchenOrder = await kitchenOrder.save();
      
      // If pantry order is approved/fulfilled, add items to kitchen store
      if (pantryOrder.status === 'approved' || pantryOrder.status === 'fulfilled') {
        const KitchenStore = require('../models/KitchenStore');
        
        for (const orderItem of pantryOrder.items) {
          const itemName = orderItem.itemId?.name || 'Unknown Item';
          const itemQuantity = Number(orderItem.quantity);
          const itemUnit = orderItem.itemId?.unit || 'pcs';
          
          if (itemName && itemQuantity > 0) {
            let kitchenItem = await KitchenStore.findOne({ name: itemName });
            
            if (kitchenItem) {
              kitchenItem.quantity = Number(kitchenItem.quantity) + itemQuantity;
              await kitchenItem.save();
              console.log(`Updated kitchen store: ${itemName} +${itemQuantity} = ${kitchenItem.quantity}`);
            } else {
              kitchenItem = new KitchenStore({
                name: itemName,
                category: 'Food',
                quantity: itemQuantity,
                unit: itemUnit
              });
              await kitchenItem.save();
              console.log(`Created kitchen store item: ${itemName} with ${itemQuantity} ${itemUnit}`);
            }
          }
        }
      }
      
      // Link back to pantry order
      pantryOrder.kitchenOrderId = savedKitchenOrder._id;
      await pantryOrder.save();
      
      createdOrders.push(savedKitchenOrder);
      console.log('Created kitchen order:', savedKitchenOrder._id, 'for pantry order:', pantryOrder._id);
    }
    
    res.json({ 
      success: true, 
      message: `Synced ${createdOrders.length} kitchen orders`,
      createdOrders: createdOrders.map(o => ({ id: o._id, pantryOrderId: o.pantryOrderId }))
    });
  } catch (error) {
    console.error('Sync kitchen orders error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllKitchenOrders,
  getKitchenOrderById,
  createKitchenOrder,
  updateKitchenOrder,
  deleteKitchenOrder,
  syncMissingKitchenOrders
};