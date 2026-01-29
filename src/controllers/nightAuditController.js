const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { getAuditLogModel } = require('../models/AuditLogModel');

// Helper function to create audit log
const createAuditLog = (action, recordId, userId, userRole, oldData, newData, req) => {
  setImmediate(async () => {
    try {
      const AuditLog = await getAuditLogModel();
      await AuditLog.create({
        action,
        module: 'NIGHT_AUDIT',
        recordId,
        userId: userId || 'SYSTEM',
        userRole: userRole || 'SYSTEM',
        oldData,
        newData,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
      });
    } catch (error) {
      console.error('❌ Audit log creation failed:', error);
    }
  });
};

// Import RestaurantOrder conditionally
let RestaurantOrder;
try {
  RestaurantOrder = require('../models/RestaurantOrder');
} catch (error) {
  console.warn('RestaurantOrder model not found, using fallback');
  RestaurantOrder = null;
}

// Generate night audit report for a specific date
const generateNightAuditReport = async (req, res) => {
  try {
    const { date } = req.params;
    const reportDate = new Date(date);
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);



    // Get all bookings for the date
    const bookings = await Booking.find({
      $or: [
        { checkInDate: { $gte: reportDate, $lt: nextDay } },
        { checkOutDate: { $gte: reportDate, $lt: nextDay } },
        { 
          checkInDate: { $lt: reportDate },
          checkOutDate: { $gt: reportDate }
        }
      ]
    }).populate('categoryId');

    // Get restaurant orders for the date
    let restaurantOrders = [];
    if (RestaurantOrder) {
      try {
        restaurantOrders = await RestaurantOrder.find({
          createdAt: { $gte: reportDate, $lt: nextDay }
        });
      } catch (error) {
        console.warn('Error fetching restaurant orders:', error.message);
      }
    }

    // Get all rooms
    const allRooms = await Room.find().populate('categoryId');

    // Calculate metrics
    const checkIns = bookings.filter(b => {
      const checkIn = new Date(b.checkInDate);
      return checkIn >= reportDate && checkIn < nextDay;
    });

    const checkOuts = bookings.filter(b => {
      const checkOut = new Date(b.checkOutDate);
      return checkOut >= reportDate && checkOut < nextDay;
    });

    const occupiedRooms = bookings.filter(b => 
      b.status === 'Checked In' || 
      (new Date(b.checkInDate) <= reportDate && new Date(b.checkOutDate) > reportDate)
    );

    // Revenue calculations
    const roomRevenue = bookings.reduce((sum, booking) => {
      if (booking.status === 'Checked In' || booking.status === 'Checked Out') {
        return sum + (booking.totalAmount || 0);
      }
      return sum;
    }, 0);

    const restaurantRevenue = restaurantOrders.reduce((sum, order) => 
      sum + (order.amount || 0), 0);

    const totalRevenue = roomRevenue + restaurantRevenue;

    // Occupancy calculations
    const totalRooms = allRooms.length;
    const occupiedCount = occupiedRooms.length;
    const occupancyRate = totalRooms > 0 ? (occupiedCount / totalRooms) * 100 : 0;

    // Average Daily Rate
    const adr = occupiedCount > 0 ? roomRevenue / occupiedCount : 0;

    // Revenue Per Available Room
    const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

    const reportData = {
      date: reportDate,
      occupancy: {
        totalRooms,
        occupiedRooms: occupiedCount,
        vacantRooms: totalRooms - occupiedCount,
        occupancyRate: Math.round(occupancyRate * 100) / 100
      },
      guestActivity: {
        checkIns: checkIns.length,
        checkOuts: checkOuts.length,
        stayOvers: occupiedRooms.filter(b => 
          new Date(b.checkInDate) < reportDate && new Date(b.checkOutDate) > nextDay
        ).length
      },
      revenue: {
        roomRevenue: Math.round(roomRevenue * 100) / 100,
        restaurantRevenue: Math.round(restaurantRevenue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        adr: Math.round(adr * 100) / 100,
        revpar: Math.round(revpar * 100) / 100
      },
      bookings: checkIns.map(b => {
        // Calculate total amount including room rates, extra beds, taxes
        const roomCost = b.roomRates && b.roomRates.length > 0 
          ? b.roomRates.reduce((sum, roomRate) => sum + (roomRate.customRate || 0), 0) * (b.days || 1)
          : (b.rate || 0);
        
        const extraBedCost = b.roomRates ? b.roomRates.reduce((sum, roomRate) => {
          return sum + (roomRate.extraBed ? (b.extraBedCharge || 0) * (b.days || 1) : 0);
        }, 0) : 0;
        
        const subtotal = roomCost + extraBedCost;
        const discount = subtotal * ((b.discountPercent || 0) / 100);
        const afterDiscount = subtotal - discount;
        const cgst = afterDiscount * (b.cgstRate || 0.025);
        const sgst = afterDiscount * (b.sgstRate || 0.025);
        const totalAmount = Math.round(afterDiscount + cgst + sgst);
        
        return {
          grcNo: b.grcNo,
          name: b.name,
          roomNumber: b.roomNumber,
          checkInDate: b.actualCheckInTime || b.checkInDate, // Use actual check-in time if available
          totalAmount: totalAmount || b.rate || 0
        };
      }),
      restaurantOrders: restaurantOrders.map(o => ({
        orderId: o._id.toString().slice(-6),
        customerName: o.customerName,
        tableNo: o.tableNo,
        amount: o.amount,
        createdAt: o.createdAt
      }))
    };

    // Create audit log for report generation
    await createAuditLog('CREATE', `REPORT_${date}`, req.user?.id, req.user?.role, null, { reportDate: date, summary: reportData }, req);

    res.json(reportData);

  } catch (error) {
    console.error('Error generating night audit report:', error);
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
};

// Get all saved night audit reports
const getAllNightAuditReports = async (req, res) => {
  res.json({ message: 'Feature not implemented yet' });
};

// Get specific night audit report by ID
const getNightAuditReportById = async (req, res) => {
  res.json({ message: 'Feature not implemented yet' });
};

// Delete night audit report
const deleteNightAuditReport = async (req, res) => {
  res.json({ message: 'Feature not implemented yet' });
};

module.exports = {
  generateNightAuditReport,
  getAllNightAuditReports,
  getNightAuditReportById,
  deleteNightAuditReport
};