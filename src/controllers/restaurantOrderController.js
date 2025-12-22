const RestaurantOrder = require('../models/RestaurantOrder.js');

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
    
    const order = await RestaurantOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Socket.IO removed - no real-time updates
    // const io = req.app.get('io');
    // if (io) {
    //   io.emit('order-status-update', {
    //     orderId: order._id,
    //     status: order.status,
    //     tableNo: order.tableNo,
    //     customerName: order.customerName,
    //     timestamp: new Date().toISOString()
    //   });
    // }
    
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
    
    const order = await RestaurantOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
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