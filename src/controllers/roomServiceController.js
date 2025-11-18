const RoomService = require("../models/RoomService");

// Create room service order
exports.createOrder = async (req, res) => {
  try {
    const { serviceType, roomNumber, guestName, grcNo, bookingId, items, notes } = req.body;
    
    if (!serviceType || !roomNumber || !guestName || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Generate order number
    const orderCount = await RoomService.countDocuments();
    const orderNumber = `RS${Date.now().toString().slice(-6)}${(orderCount + 1).toString().padStart(3, '0')}`;

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;
      return { ...item, totalPrice };
    });

    const tax = subtotal * 0.18; // 18% GST
    const serviceCharge = subtotal * 0.10; // 10% service charge
    const totalAmount = subtotal + tax + serviceCharge;

    const order = new RoomService({
      orderNumber,
      serviceType,
      roomNumber,
      guestName,
      grcNo,
      bookingId,
      items: processedItems,
      subtotal,
      tax,
      serviceCharge,
      totalAmount,
      createdBy: req.user.id,
      notes
    });

    await order.save();
    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status, roomNumber, serviceType, page = 1, limit = 20 } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (roomNumber) filter.roomNumber = roomNumber;
    if (serviceType) filter.serviceType = serviceType;

    const orders = await RoomService.find(filter)
      .populate("createdBy", "username")
      .populate("bookingId", "name grcNo")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await RoomService.countDocuments(filter);

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await RoomService.findById(req.params.id)
      .populate("createdBy", "username")
      .populate("bookingId", "name grcNo phoneNumber");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await RoomService.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    if (status === "delivered") {
      order.deliveryTime = new Date();
    }

    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate KOT
exports.generateKOT = async (req, res) => {
  try {
    const order = await RoomService.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.kotGenerated) {
      return res.status(400).json({ message: "KOT already generated" });
    }

    // Generate 4-digit KOT number
    const KOT = require('../models/KOT');
    const today = new Date();
    const count = await KOT.countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    });
    const nextNumber = (count % 9999) + 1;
    const kotNumber = String(nextNumber).padStart(4, '0');
    order.kotGenerated = true;
    order.kotNumber = kotNumber;
    order.kotGeneratedAt = new Date();
    order.status = "confirmed";

    await order.save();
    res.json({ success: true, order, kotNumber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate Bill
exports.generateBill = async (req, res) => {
  try {
    const order = await RoomService.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.billGenerated) {
      return res.status(400).json({ message: "Bill already generated" });
    }

    const billNumber = `BILL${Date.now().toString().slice(-8)}`;
    order.billGenerated = true;
    order.billNumber = billNumber;
    order.billGeneratedAt = new Date();

    await order.save();
    res.json({ success: true, order, billNumber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bill lookup
exports.billLookup = async (req, res) => {
  try {
    const { billNumber, orderNumber, roomNumber, grcNo } = req.query;

    let filter = {};
    if (billNumber) filter.billNumber = billNumber;
    if (orderNumber) filter.orderNumber = orderNumber;
    if (roomNumber) filter.roomNumber = roomNumber;
    if (grcNo) filter.grcNo = grcNo;

    const orders = await RoomService.find(filter)
      .populate("createdBy", "username")
      .populate("bookingId", "name grcNo phoneNumber")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const order = await RoomService.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get room service charges for checkout
exports.getRoomServiceCharges = async (req, res) => {
  try {
    const { bookingId } = req.query;
    
    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const filter = {
      bookingId: bookingId,
      status: "delivered",
      paymentStatus: "unpaid"
    };

    const orders = await RoomService.find(filter)
      .select('orderNumber serviceType totalAmount items createdAt')
      .sort({ createdAt: -1 });

    const totalCharges = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      success: true,
      orders,
      totalCharges,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark room service orders as paid
exports.markOrdersPaid = async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const filter = {
      bookingId: bookingId,
      status: "delivered",
      paymentStatus: "unpaid"
    };

    await RoomService.updateMany(filter, {
      paymentStatus: "paid"
    });

    res.json({ success: true, message: "Room service orders marked as paid" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await RoomService.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Cannot delete confirmed orders" });
    }

    await RoomService.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};