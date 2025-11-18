const Notification = require('../models/Notification');
const RestaurantOrder = require('../models/RestaurantOrder');

// Send notification when order is ready
exports.sendOrderReadyNotification = async (req, res) => {
  try {
    const { orderId, kotId, tableNo, message } = req.body;

    // Find the order to get the staff who created it
    const order = await RestaurantOrder.findById(orderId).populate('createdBy');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create notification for the staff who created the order
    const notification = new Notification({
      recipient: order.createdBy._id,
      message: message || `Order for Table ${tableNo} is ready for serving`,
      type: 'order_ready',
      orderId,
      kotId,
      tableNo
    });

    await notification.save();
    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get notifications for current user
exports.getMyNotifications = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id }, 
      { isRead: true }
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

