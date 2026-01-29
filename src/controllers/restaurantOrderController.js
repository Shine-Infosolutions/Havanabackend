const RestaurantOrder = require('../models/RestaurantOrder.js');
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
        module: 'RESTAURANT_ORDER',
        recordId,
        userId: userId || new mongoose.Types.ObjectId(),
        userRole: userRole || 'SYSTEM',
        oldData,
        newData,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
      });
      console.log(`✅ Audit log created: ${action} for restaurant order ${recordId}`);
    } catch (error) {
      console.error('❌ Audit log creation failed:', error);
    }
  });
};

// Create new restaurant order
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Try to link order to booking if tableNo matches a room number
    if (orderData.tableNo) {
      const Booking = require('../models/Booking');
      const booking = await Booking.findOne({
        roomNumber: { $regex: new RegExp(`(^|,)\\s*${orderData.tableNo}\\s*(,|$)`) },
        status: { $in: ['Booked', 'Checked In'] },
        isActive: true
      });
      
      if (booking) {
        orderData.bookingId = booking._id;
        orderData.grcNo = booking.grcNo;
        orderData.roomNumber = booking.roomNumber;
        orderData.guestName = booking.name;
        orderData.guestPhone = booking.mobileNo;
      }
    }
    
    const order = new RestaurantOrder(orderData);
    await order.save();

    // Create audit log
    createAuditLog('CREATE', order._id, req.user?.id, req.user?.role, null, order.toObject(), req);

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await RestaurantOrder.find()
      .sort({ createdAt: -1 })
      .populate('items.itemId', 'name price')
      .populate('bookingId', 'grcNo roomNumber guestName invoiceNumber')
      .maxTimeMS(5000)
      .lean()
      .exec();
    res.json(orders);
  } catch (error) {
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      res.status(408).json({ error: 'Database query timeout. Please try again.' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Get original data for audit log
    const originalOrder = await RestaurantOrder.findById(id);
    if (!originalOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = await RestaurantOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    // Create audit log
    await createAuditLog('UPDATE', order._id, req.user?.id, req.user?.role, originalOrder.toObject(), order.toObject(), req);
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update restaurant order
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Get original data for audit log
    const originalOrder = await RestaurantOrder.findById(id);
    if (!originalOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = await RestaurantOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    // Create audit log
    await createAuditLog('UPDATE', order._id, req.user?.id, req.user?.role, originalOrder.toObject(), order.toObject(), req);
    
    // Also update corresponding KOT if items were updated
    if (updateData.items) {
      try {
        const KOT = require('../models/KOT');
        const kot = await KOT.findOne({ orderId: id });
        if (kot) {
          const kotItems = updateData.items.map(item => ({
            itemName: item.itemName,
            quantity: item.quantity,
            specialInstructions: item.note || ''
          }));
          await KOT.findByIdAndUpdate(kot._id, { items: kotItems });
        }
      } catch (kotError) {
        console.error('Error updating KOT:', kotError);
      }
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Link existing restaurant orders to bookings
exports.linkOrdersToBookings = async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    
    // Get all restaurant orders without booking links
    const unlinkedOrders = await RestaurantOrder.find({
      $or: [
        { bookingId: { $exists: false } },
        { bookingId: null },
        { grcNo: { $exists: false } },
        { grcNo: null }
      ]
    });
    
    let linkedCount = 0;
    
    for (const order of unlinkedOrders) {
      if (order.tableNo) {
        const booking = await Booking.findOne({
          roomNumber: { $regex: new RegExp(`(^|,)\\s*${order.tableNo}\\s*(,|$)`) },
          status: { $in: ['Booked', 'Checked In'] },
          isActive: true
        });
        
        if (booking) {
          await RestaurantOrder.findByIdAndUpdate(order._id, {
            bookingId: booking._id,
            grcNo: booking.grcNo,
            roomNumber: booking.roomNumber,
            guestName: booking.name,
            guestPhone: booking.mobileNo
          });
          linkedCount++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Linked ${linkedCount} restaurant orders to bookings`,
      linkedCount,
      totalUnlinked: unlinkedOrders.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};