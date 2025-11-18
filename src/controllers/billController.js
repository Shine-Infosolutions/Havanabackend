const Bill = require('../models/Bill');
const RestaurantOrder = require('../models/RestaurantOrder');
const RestaurantReservation = require('../models/RestaurantReservation');

// Generate bill number
const generateBillNumber = async (isRoomService = false) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = isRoomService ? 'RS-' : 'BILL';
  const count = await Bill.countDocuments({
    billNumber: { $regex: `^${prefix}` },
    createdAt: {
      $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    }
  });
  return `${prefix}${dateStr}${String(count + 1).padStart(4, '0')}`;
};

// Create bill from order
exports.createBill = async (req, res) => {
  try {
    const { orderId, discount, tax, paymentMethod, reservationId } = req.body;
    
    const order = await RestaurantOrder.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    let advanceAmount = 0;
    let reservation = null;
    
    // Check for reservation advance payment
    if (reservationId) {
      reservation = await RestaurantReservation.findById(reservationId);
      if (reservation && !reservation.isAdvanceAdjusted) {
        advanceAmount = reservation.advancePayment || 0;
      }
    }
    
    // Check if this is a room service order (tableNo starts with 'R')
    const isRoomService = order.tableNo && order.tableNo.startsWith('R');
    const billNumber = await generateBillNumber(isRoomService);
    const subtotal = order.amount;
    const discountAmount = discount || 0;
    const taxAmount = tax || 0;
    const totalAmount = subtotal - discountAmount + taxAmount;
    const remainingAmount = Math.max(0, totalAmount - advanceAmount);
    
    const bill = new Bill({
      orderId,
      billNumber,
      tableNo: order.tableNo,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      totalAmount,
      advancePayment: advanceAmount,
      remainingAmount,
      paymentMethod,
      cashierId: req.user?.id || req.user?._id
    });
    
    await bill.save();
    
    // Mark advance as adjusted
    if (reservation && advanceAmount > 0) {
      reservation.isAdvanceAdjusted = true;
      reservation.adjustedInBill = bill._id;
      await reservation.save();
    }
    
    res.status(201).json({
      ...bill.toObject(),
      advanceAdjusted: advanceAmount,
      pendingAmount: remainingAmount
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { paidAmount, paymentMethod } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    
    const remainingAmount = bill.remainingAmount || bill.totalAmount;
    const changeAmount = paidAmount > remainingAmount ? paidAmount - remainingAmount : 0;
    const paymentStatus = paidAmount >= remainingAmount ? 'paid' : 'pending';
    
    bill.paidAmount = paidAmount;
    bill.changeAmount = changeAmount;
    bill.paymentStatus = paymentStatus;
    bill.paymentMethod = paymentMethod;
    
    await bill.save();
    
    // Update order status to paid if fully paid
    if (paymentStatus === 'paid') {
      const order = await RestaurantOrder.findByIdAndUpdate(bill.orderId, { status: 'paid' }, { new: true });
      
      // Update table status to available when payment is completed
      if (order) {
        const Table = require('../models/Table');
        try {
          const table = await Table.findOneAndUpdate(
            { tableNumber: order.tableNo },
            { status: 'available' },
            { new: true }
          );
          
          // Emit WebSocket event if available
          const io = req.app.get('io');
          if (table && io) {
            io.to('waiters').emit('table-status-updated', {
              tableId: table._id,
              tableNumber: table.tableNumber,
              status: 'available'
            });
          }
        } catch (tableError) {
          console.error('Error updating table status:', tableError);
        }
      }
    }
    
    res.json({
      ...bill.toObject(),
      totalBillAmount: bill.totalAmount,
      advanceAdjusted: bill.advancePayment || 0,
      amountPaidNow: paidAmount,
      changeReturned: changeAmount
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Process split payment
exports.processSplitPayment = async (req, res) => {
  try {
    const { payments } = req.body; // [{ method: 'cash', amount: 500 }, { method: 'upi', amount: 300 }]
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const changeAmount = totalPaid > bill.totalAmount ? totalPaid - bill.totalAmount : 0;
    const paymentStatus = totalPaid >= bill.totalAmount ? 'paid' : 'pending';
    
    bill.paidAmount = totalPaid;
    bill.changeAmount = changeAmount;
    bill.paymentStatus = paymentStatus;
    bill.paymentMethod = 'split';
    bill.splitPayments = payments;
    
    await bill.save();
    
    // Update order status to paid if fully paid
    if (paymentStatus === 'paid') {
      const order = await RestaurantOrder.findByIdAndUpdate(bill.orderId, { status: 'paid' }, { new: true });
      
      // Update table status to available when payment is completed
      if (order) {
        const Table = require('../models/Table');
        try {
          const table = await Table.findOneAndUpdate(
            { tableNumber: order.tableNo },
            { status: 'available' },
            { new: true }
          );
          
          // Emit WebSocket event if available
          const io = req.app.get('io');
          if (table && io) {
            io.to('waiters').emit('table-status-updated', {
              tableId: table._id,
              tableNumber: table.tableNumber,
              status: 'available'
            });
          }
        } catch (tableError) {
          console.error('Error updating table status:', tableError);
        }
      }
    }
    
    res.json(bill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all bills
exports.getAllBills = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.query;
    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    
    const bills = await Bill.find(filter)
      .populate('orderId', 'staffName phoneNumber')
      .populate('cashierId', 'username')
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get bill by ID
exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('orderId')
      .populate('cashierId', 'username');
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get bill details with items from all KOTs
exports.getBillDetails = async (req, res) => {
  try {
    const KOT = require('../models/KOT');
    const bill = await Bill.findById(req.params.id)
      .populate('orderId')
      .populate('cashierId', 'username');
    
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    
    const kots = await KOT.find({ orderId: bill.orderId })
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
    
    res.json({ ...bill.toObject(), items: allItems, kotCount: kots.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get bill by order ID with items from all KOTs
exports.getBillByOrderId = async (req, res) => {
  try {
    const KOT = require('../models/KOT');
    const bill = await Bill.findOne({ orderId: req.params.orderId })
      .populate('orderId')
      .populate('cashierId', 'username');
    
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    
    const kots = await KOT.find({ orderId: req.params.orderId })
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
    
    res.json({ ...bill.toObject(), items: allItems, kotCount: kots.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update bill status
exports.updateBillStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true }
    );
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    
    // Update order status if bill is marked as paid
    if (paymentStatus === 'paid') {
      const order = await RestaurantOrder.findByIdAndUpdate(bill.orderId, { status: 'paid' }, { new: true });
      
      // Update table status to available when payment is completed
      if (order) {
        const Table = require('../models/Table');
        try {
          const table = await Table.findOneAndUpdate(
            { tableNumber: order.tableNo },
            { status: 'available' },
            { new: true }
          );
          
          // Emit WebSocket event if available
          const io = req.app.get('io');
          if (table && io) {
            io.to('waiters').emit('table-status-updated', {
              tableId: table._id,
              tableNumber: table.tableNumber,
              status: 'available'
            });
          }
        } catch (tableError) {
          console.error('Error updating table status:', tableError);
        }
      }
    }
    
    res.json(bill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get bill with advance payment details
exports.getBillWithAdvanceDetails = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('orderId')
      .populate('cashierId', 'username');
    
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    
    let reservation = null;
    if (bill.advancePayment > 0) {
      reservation = await RestaurantReservation.findOne({ adjustedInBill: bill._id });
    }
    
    res.json({
      ...bill.toObject(),
      reservation: reservation ? {
        reservationNumber: reservation.reservationNumber,
        guestName: reservation.guestName,
        advancePayment: reservation.advancePayment
      } : null,
      paymentBreakdown: {
        totalBill: bill.totalAmount,
        advanceAdjusted: bill.advancePayment || 0,
        remainingAmount: bill.remainingAmount || bill.totalAmount,
        paidAmount: bill.paidAmount || 0,
        changeAmount: bill.changeAmount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};