const KOT = require('../models/KOT');
const RestaurantOrder = require('../models/RestaurantOrder');
const Item = require('../models/Items');
const Notification = require('../models/Notification');

// Generate KOT number
const generateKOTNumber = async () => {
  const today = new Date();
  const count = await KOT.countDocuments({
    createdAt: {
      $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    }
  });
  
  const nextNumber = (count % 999) + 1;
  const sequentialNumber = String(nextNumber).padStart(3, '0');
  const dateStr = today.getFullYear().toString() + 
                  String(today.getMonth() + 1).padStart(2, '0') + 
                  String(today.getDate()).padStart(2, '0');
  
  return `KOT${dateStr}${sequentialNumber}`;
};

// Extract display number from KOT number
const getKOTDisplayNumber = (kotNumber) => {
  if (!kotNumber) return '000';
  // Extract last 3 digits from KKOT20251113001 format
  return kotNumber.slice(-3);
};

// Create KOT from order
exports.createKOT = async (req, res) => {
  try {
    const { orderId, items, priority, estimatedTime, specialInstructions } = req.body;
    
    const order = await RestaurantOrder.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const kotNumber = await generateKOTNumber();
    
    // Get item details
    const kotItems = await Promise.all(items.map(async (item) => {
      const itemDetails = await Item.findById(item.itemId);
      return {
        itemId: item.itemId,
        itemName: itemDetails?.name || 'Unknown Item',
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || specialInstructions
      };
    }));
    
    const kot = new KOT({
      orderId,
      kotNumber,
      tableNo: order.tableNo,
      items: kotItems,
      priority: priority || 'normal',
      estimatedTime,
      createdBy: req.user?._id,
      // Include room service details if applicable
      guestName: order.guestName,
      roomNumber: order.roomNumber
    });
    
    await kot.save();
    
    // 🔥 WebSocket: Emit new KOT event to both waiters and kitchen
    const io = req.app.get('io');
    if (io) {
      const kotData = {
        kot: {
          ...kot.toObject(),
          displayNumber: getKOTDisplayNumber(kot.kotNumber)
        },
        tableNo: order.tableNo,
        itemCount: kotItems.length,
        timestamp: new Date().toISOString()
      };
      
      // Emit to waiters for order tracking
      io.to('waiters').emit('new-kot', kotData);
      
      // Emit to kitchen for live KOT updates
      io.to('kitchen-updates').emit('new-kot-created', kotData);
      
      console.log('🔥 New KOT broadcasted:', kot.kotNumber);
    }
    
    res.status(201).json({
      ...kot.toObject(),
      displayNumber: getKOTDisplayNumber(kot.kotNumber)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all KOTs
exports.getAllKOTs = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    
    const kots = await KOT.find(filter)
      .populate('items.itemId', 'name')
      .populate('createdBy', 'username')
      .populate('assignedChef', 'username')
      .sort({ createdAt: -1 });
    const kotsWithDisplayNumber = kots.map(kot => ({
      ...kot.toObject(),
      displayNumber: getKOTDisplayNumber(kot.kotNumber)
    }));
    res.json(kotsWithDisplayNumber);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update KOT status
exports.updateKOTStatus = async (req, res) => {
  try {
    const { status, actualTime, assignedChef } = req.body;
    const updates = { status };
    
    if (actualTime) updates.actualTime = actualTime;
    if (assignedChef) updates.assignedChef = assignedChef;
    
    const kot = await KOT.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('items.itemId', 'name')
      .populate('createdBy', 'username')
      .populate('assignedChef', 'username');
    if (!kot) return res.status(404).json({ error: 'KOT not found' });
    
    // 🔥 WebSocket: Emit KOT status update
    const io = req.app.get('io');
    if (io) {
      const updateData = {
        kotId: kot._id,
        orderId: kot.orderId,
        status: kot.status,
        tableNo: kot.tableNo,
        kot: {
          ...kot.toObject(),
          displayNumber: getKOTDisplayNumber(kot.kotNumber)
        },
        timestamp: new Date().toISOString()
      };
      
      // Emit to waiters for order tracking
      io.to('waiters').emit('kot-status-updated', updateData);
      
      // Emit to kitchen for chef dashboard
      io.to('kitchen-updates').emit('kot-status-updated', updateData);
      
      console.log('🔥 KOT status update broadcasted:', kot.kotNumber, '->', kot.status);
    }
    
    // Send notification when order is marked as served
    if (status === 'served') {
      const order = await RestaurantOrder.findById(kot.orderId).populate('createdBy');
      
      if (order && order.createdBy) {
        const notification = new Notification({
          recipient: order.createdBy._id,
          message: `Order for Table ${kot.tableNo} is ready for serving`,
          type: 'order_ready',
          orderId: kot.orderId,
          kotId: kot._id,
          tableNo: kot.tableNo
        });
        await notification.save();
      }
    }
    
    res.json({
      ...kot.toObject(),
      displayNumber: getKOTDisplayNumber(kot.kotNumber)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get KOT by ID
exports.getKOTById = async (req, res) => {
  try {
    const kot = await KOT.findById(req.params.id)
      .populate('orderId')
      .populate('items.itemId', 'name Price')
      .populate('createdBy', 'username')
      .populate('assignedChef', 'username');
    if (!kot) return res.status(404).json({ error: 'KOT not found' });
    res.json({
      ...kot.toObject(),
      displayNumber: getKOTDisplayNumber(kot.kotNumber)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update item statuses
exports.updateItemStatuses = async (req, res) => {
  try {
    const { itemStatuses } = req.body;
    
    if (!Array.isArray(itemStatuses)) {
      return res.status(400).json({ error: 'itemStatuses must be an array' });
    }
    
    const kot = await KOT.findById(req.params.kotId);
    if (!kot) return res.status(404).json({ error: 'KOT not found' });
    
    // Update or add item statuses
    itemStatuses.forEach(({ itemIndex, status }) => {
      const existingIndex = kot.itemStatuses.findIndex(item => item.itemIndex === itemIndex);
      
      if (existingIndex >= 0) {
        kot.itemStatuses[existingIndex].status = status;
        kot.itemStatuses[existingIndex].checkedAt = new Date();
      } else {
        kot.itemStatuses.push({ itemIndex, status, checkedAt: new Date() });
      }
    });
    
    await kot.save();
    
    // WebSocket: Emit item status update
    const io = req.app.get('io');
    if (io) {
      const updateData = {
        kotId: kot._id,
        itemStatuses: kot.itemStatuses,
        tableNo: kot.tableNo,
        kot: {
          ...kot.toObject(),
          displayNumber: getKOTDisplayNumber(kot.kotNumber)
        },
        timestamp: new Date().toISOString()
      };
      
      // Emit to waiters for order tracking
      io.to('waiters').emit('kot-item-status-updated', updateData);
      
      // Emit to kitchen for chef dashboard
      io.to('kitchen-updates').emit('kot-item-status-updated', updateData);
      
      console.log('🔥 KOT item status update broadcasted:', kot.kotNumber);
    }
    
    res.json({ itemStatuses: kot.itemStatuses });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update KOT
exports.updateKOT = async (req, res) => {
  try {
    const kot = await KOT.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('items.itemId', 'name')
      .populate('createdBy', 'username')
      .populate('assignedChef', 'username');
    if (!kot) return res.status(404).json({ error: 'KOT not found' });
    res.json({
      ...kot.toObject(),
      displayNumber: getKOTDisplayNumber(kot.kotNumber)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Create KOT automatically when order is created
exports.createKOTFromOrder = async (orderId) => {
  try {
    const order = await RestaurantOrder.findById(orderId).populate('items.itemId');
    if (!order) return null;
    
    const kotNumber = await generateKOTNumber();
    
    const kotItems = order.items.map(item => ({
      itemId: item.itemId._id,
      itemName: item.itemId.name,
      quantity: item.quantity,
      specialInstructions: ''
    }));
    
    const kot = new KOT({
      orderId: order._id,
      kotNumber,
      tableNo: order.tableNo,
      items: kotItems,
      priority: 'normal',
      createdBy: order.createdBy,
      // Include room service details if applicable
      guestName: order.guestName,
      roomNumber: order.roomNumber
    });
    
    await kot.save();
    return kot;
  } catch (error) {
    console.error('Error creating KOT from order:', error);
    return null;
  }
};