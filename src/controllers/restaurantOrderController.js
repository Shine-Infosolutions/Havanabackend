const RestaurantOrder = require("../models/RestaurantOrder");
const Item = require("../models/Items");
const KOT = require("../models/KOT");
const Bill = require("../models/Bill");
const Table = require("../models/Table");

// Generate KOT number
const generateKOTNumber = async () => {
  const today = new Date();
  const dateStr = today.getFullYear().toString() + 
                  String(today.getMonth() + 1).padStart(2, '0') + 
                  String(today.getDate()).padStart(2, '0');
  
  const count = await KOT.countDocuments({
    createdAt: {
      $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    }
  });
  
  const nextNumber = (count % 999) + 1;
  const sequentialNumber = String(nextNumber).padStart(3, '0');
  
  return `KOT${dateStr}${sequentialNumber}`;
};

exports.createOrder = async (req, res) => {
  try {
    const { bookingId, items } = req.body;

    // ✅ Validate order type
    if (!bookingId) {
      if (!req.body.staffName || !req.body.tableNo) {
        return res.status(400).json({
          error: "For non-booking orders, staffName and tableNo are required",
        });
      }
    }
    
    // ✅ Handle room service orders (tableNo starts with 'R')
    const isRoomService = req.body.tableNo && req.body.tableNo.startsWith('R');
    if (isRoomService && !req.body.guestName) {
      return res.status(400).json({
        error: "For room service orders, guestName is required",
      });
    }

    // ✅ Fetch item details (attach name and price)
    const populatedItems = await Promise.all(
      items.map(async (item) => {
        const itemDetails = await Item.findById(item.itemId);
        return {
          itemId: item.itemId,
          itemName: itemDetails?.name || "Unknown Item",
          quantity: item.quantity,
          price: itemDetails?.Price || 0,
        };
      })
    );

    // ✅ Calculate total amount
    const totalAmount = populatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // ✅ Save Order
    const orderData = {
      ...req.body,
      items: populatedItems, // with names & price
      amount: totalAmount,
      createdBy: req.user?.id,
    };

    const order = new RestaurantOrder(orderData);
    await order.save();

    // ✅ Auto-create KOT
    const kotNumber = await generateKOTNumber();

    const kotItems = populatedItems.map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      quantity: item.quantity,
      rate: item.price,
      amount: item.price * item.quantity,
    }));

    const kot = new KOT({
      orderId: order._id,
      kotNumber,
      tableNo: order.tableNo || "Inhouse Booking",
      items: kotItems,
      createdBy: req.user?.id,
      // Include room service details if applicable
      guestName: order.guestName,
      roomNumber: order.roomNumber
    });

    await kot.save();

    // 🔥 WebSocket: Emit new order event
    const io = req.app.get('io');
    if (io) {
      const orderData = {
        order: order.toObject(),
        kot: kot.toObject(),
        tableNo: order.tableNo,
        itemCount: kotItems.length,
        timestamp: new Date().toISOString()
      };
      
      console.log('🔥 New order broadcasted:', order._id, 'Table:', order.tableNo);
      
      // Emit to waiters for order tracking
      io.to('waiters').emit('new-order', orderData);
      
      // Emit to kitchen for live KOT updates
      io.to('kitchen-updates').emit('new-restaurant-order', orderData);
    }

    // Update table status to occupied
    try {
      console.log('Attempting to update table status for table:', order.tableNo);
      const table = await Table.findOneAndUpdate(
        { tableNumber: order.tableNo },
        { status: 'occupied' },
        { new: true }
      );
      if (table) {
        console.log('Table status updated successfully:', table.tableNumber, 'to', table.status);
        if (io) {
          io.to('waiters').emit('table-status-updated', {
            tableId: table._id,
            tableNumber: table.tableNumber,
            status: 'occupied'
          });
        }
      } else {
        console.log('Table not found with number:', order.tableNo);
      }
    } catch (tableError) {
      console.error('Error updating table status:', tableError);
    }

    res.status(201).json({
      success: true,
      order,
      kot,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Get all restaurant orders with KOT items
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await RestaurantOrder.find()
      .populate("items.itemId", "name Price category Discount")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    
    const ordersWithKotItems = await Promise.all(orders.map(async (order) => {
      const kots = await KOT.find({ orderId: order._id })
        .populate('items.itemId', 'name Price category');
      
      const allItems = [];
      kots.forEach(kot => {
        kot.items.forEach(item => {
          allItems.push({
            itemName: item.itemName || item.itemId?.name || 'Unknown',
            price: item.rate || item.itemId?.Price || 0,
            quantity: item.quantity,
            total: (item.rate || item.itemId?.Price || 0) * item.quantity,
            kotNumber: kot.kotNumber
          });
        });
      });
      
      return {
        ...order.toObject(),
        allKotItems: allItems,
        kotCount: kots.length
      };
    }));
    
    res.json(ordersWithKotItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single order by ID with KOT items
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await RestaurantOrder.findById(req.params.id)
      .populate('items.itemId', 'name Price category Discount')
      .populate('createdBy', 'name');
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const kots = await KOT.find({ orderId: order._id })
      .populate('items.itemId', 'name Price category');
    
    const allItems = [];
    kots.forEach(kot => {
      kot.items.forEach(item => {
        allItems.push({
          itemName: item.itemName || item.itemId?.name || 'Unknown',
          price: item.rate || item.itemId?.Price || 0,
          quantity: item.quantity,
          total: (item.rate || item.itemId?.Price || 0) * item.quantity,
          kotNumber: kot.kotNumber
        });
      });
    });

    const formatted = {
      _id: order._id,
      staffName: order.staffName,
      tableNo: order.tableNo,
      amount: order.amount,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items.map(i => ({
        itemName: i.itemId?.name || 'Unknown',
        price: i.itemId?.Price || i.price,
        quantity: i.quantity,
        total: (i.itemId?.Price || i.price) * i.quantity
      })),
      allKotItems: allItems,
      kotCount: kots.length
    };

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get orders by table number
exports.getOrdersByTable = async (req, res) => {
  try {
    const orders = await RestaurantOrder.find({ tableNo: req.params.tableNo })
      .populate("items.itemId", "name Price category Discount")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add items to existing order
exports.addItemsToOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const order = await RestaurantOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    for (const newItem of items) {
      const itemDetails = await Item.findById(newItem.itemId);
      if (!itemDetails) continue;
      
      const existingItemIndex = order.items.findIndex(
        item => item.itemId.toString() === newItem.itemId
      );
      
      if (existingItemIndex >= 0) {
        order.items[existingItemIndex].quantity += newItem.quantity;
      } else {
        order.items.push({
          itemId: newItem.itemId,
          itemName: itemDetails.name,
          quantity: newItem.quantity,
          price: itemDetails.Price
        });
      }
    }
    
    // Recalculate total amount from all items
    order.amount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    await order.save();
    
    // Update existing bill if it exists
    const existingBill = await Bill.findOne({ orderId: order._id });
    if (existingBill) {
      existingBill.subtotal = totalAmount;
      existingBill.totalAmount = totalAmount - existingBill.discount + existingBill.tax;
      await existingBill.save();
    }
    
    // Find existing KOT for this order
    let existingKot = await KOT.findOne({ orderId: order._id });
    
    if (existingKot) {
      // Add new items to existing KOT
      for (const newItem of items) {
        const itemDetails = await Item.findById(newItem.itemId);
        if (!itemDetails) continue;
        
        existingKot.items.push({
          itemId: newItem.itemId,
          itemName: itemDetails.name,
          quantity: newItem.quantity,
          rate: itemDetails.Price,
          amount: itemDetails.Price * newItem.quantity
        });
      }
      
      await existingKot.save();
      
      // WebSocket: Emit KOT update
      const io = req.app.get('io');
      if (io) {
        io.to('waiters').emit('kot-items-added', {
          kotId: existingKot._id,
          orderId: order._id,
          newItems: items,
          tableNo: order.tableNo
        });
      }
      
      res.json({ order, kot: existingKot });
    } else {
      // Create new KOT if none exists (fallback)
      const kotNumber = await generateKOTNumber();
      const kotItems = await Promise.all(items.map(async (item) => {
        const itemDetails = await Item.findById(item.itemId);
        return {
          itemId: item.itemId,
          itemName: itemDetails?.name || 'Unknown Item',
          quantity: item.quantity,
          rate: itemDetails?.Price || 0,
          amount: (itemDetails?.Price || 0) * item.quantity
        };
      }));
      
      const newKot = new KOT({
        orderId: order._id,
        kotNumber,
        tableNo: order.tableNo,
        items: kotItems,
        createdBy: req.user?.id
      });
      await newKot.save();
      
      res.json({ order, kot: newKot });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Transfer order to different table
exports.transferTable = async (req, res) => {
  try {
    const { newTableNo, reason } = req.body;
    const order = await RestaurantOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const oldTableNo = order.tableNo;

    // Update order table number
    order.tableNo = newTableNo;
    order.transferHistory = order.transferHistory || [];
    order.transferHistory.push({
      fromTable: oldTableNo,
      toTable: newTableNo,
      reason: reason || "Customer request",
      transferredBy: req.user?.id || req.user?._id,
      transferredAt: new Date(),
    });

    await order.save();

    // Update all related KOTs
    await KOT.updateMany({ orderId: order._id }, { tableNo: newTableNo });

    // Update bill if exists
    await Bill.updateMany({ orderId: order._id }, { tableNo: newTableNo });

    res.json({
      message: `Order transferred from Table ${oldTableNo} to Table ${newTableNo}`,
      order,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await RestaurantOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    
    // If order is cancelled, also cancel all associated KOTs
    if (status === 'cancelled') {
      const KOT = require('../models/KOT');
      await KOT.updateMany(
        { orderId: order._id },
        { status: 'cancelled' }
      );
    }
    
    // 🔥 WebSocket: Emit order status update
    const io = req.app.get('io');
    if (io) {
      const updateData = {
        orderId: order._id,
        status: order.status,
        tableNo: order.tableNo,
        order: order.toObject(),
        timestamp: new Date().toISOString()
      };
      
      console.log('🔥 Order status update broadcasted:', order._id, '->', order.status);
      
      // Emit to waiters for order tracking
      io.to('waiters').emit('order-status-updated', updateData);
      
      // Emit to kitchen for chef dashboard
      io.to('kitchen-updates').emit('order-status-updated', updateData);
    }

    // Auto-release table when order is both served and paid
    const shouldReleaseTable = async () => {
      // Get all orders for this table
      const tableOrders = await RestaurantOrder.find({ tableNo: order.tableNo });
      
      // Check if all orders for this table are both served and paid
      const allOrdersComplete = tableOrders.every(tableOrder => 
        (tableOrder.status === 'served' || tableOrder.status === 'paid' || tableOrder.status === 'completed') &&
        (tableOrder._id.toString() === order._id.toString() ? 
          (status === 'served' || status === 'paid' || status === 'completed') : true)
      );
      
      if (allOrdersComplete) {
        try {
          const table = await Table.findOneAndUpdate(
            { tableNumber: order.tableNo },
            { status: 'available' },
            { new: true }
          );
          if (table && io) {
            console.log(`Table ${table.tableNumber} automatically released - all orders complete`);
            io.to('waiters').emit('table-status-updated', {
              tableId: table._id,
              tableNumber: table.tableNumber,
              status: 'available'
            });
          }
        } catch (tableError) {
          console.error('Error auto-releasing table:', tableError);
        }
      }
    };
    
    // Check if table should be released when order status changes to served, paid, or completed
    if (['served', 'paid', 'completed'].includes(status)) {
      await shouldReleaseTable();
    }
    
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Add transaction to order history
exports.addTransaction = async (req, res) => {
  try {
    const { amount, method, billId } = req.body;
    const order = await RestaurantOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const transaction = {
      amount,
      method,
      billId,
      processedBy: req.user?.id,
      processedAt: new Date()
    };
    
    order.transactionHistory = order.transactionHistory || [];
    order.transactionHistory.push(transaction);
    await order.save();
    
    res.json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Generate invoice for an order with all KOT items
exports.generateInvoice = async (req, res) => {
  try {
    const order = await RestaurantOrder.findById(req.params.id)
      .populate('items.itemId', 'name Price category Discount')
      .populate('createdBy', 'name');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Get all KOTs for this order
    const kots = await KOT.find({ orderId: order._id })
      .populate('items.itemId', 'name Price category Discount');
    
    let subtotal = 0;
    const invoiceItems = [];
    
    // Process items from all KOTs
    kots.forEach(kot => {
      kot.items.forEach(item => {
        const itemPrice = item.rate || item.itemId?.Price || 0;
        const discount = item.itemId?.Discount || 0;
        const discountAmount = (itemPrice * discount) / 100;
        const finalPrice = itemPrice - discountAmount;
        const itemTotal = finalPrice * item.quantity;
        subtotal += itemTotal;
        
        invoiceItems.push({
          name: item.itemName || item.itemId?.name || 'Unknown',
          price: itemPrice,
          discount: discount,
          finalPrice: finalPrice,
          quantity: item.quantity,
          total: itemTotal,
          kotNumber: kot.kotNumber
        });
      });
    });
    
    const orderDiscount = order.discount || 0;
    const orderDiscountAmount = (subtotal * orderDiscount) / 100;
    const finalAmount = subtotal - orderDiscountAmount;
    
    const invoice = {
      orderId: order._id,
      tableNo: order.tableNo,
      staffName: order.staffName,
      customerName: order.customerName,
      items: invoiceItems,
      subtotal: subtotal,
      orderDiscount: orderDiscount,
      orderDiscountAmount: orderDiscountAmount,
      finalAmount: finalAmount,
      status: order.status,
      createdAt: order.createdAt,
      notes: order.notes,
      couponCode: order.couponCode,
      isMembership: order.isMembership,
      isLoyalty: order.isLoyalty,
      kotCount: kots.length
    };
    
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
