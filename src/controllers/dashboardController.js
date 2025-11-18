const Booking = require("../models/Booking");
const Reservation = require("../models/Reservation");
const BanquetBooking = require("../models/banquetBooking");
const CabBooking = require("../models/cabBooking");
const Laundry = require("../models/Laundry");
const RestaurantOrder = require('../models/RestaurantOrder');
const Bill = require('../models/Bill');
const KOT = require('../models/KOT');

// ----------- Booking Module Stats -----------
exports.getBookingStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const totalBookings = await Booking.countDocuments();
    const activeGuests = await Booking.countDocuments({ status: "Checked In" });
    const checkinsToday = await Booking.countDocuments({ checkInDate: { $gte: startOfDay, $lte: endOfDay } });
    const checkoutsToday = await Booking.countDocuments({ checkOutDate: { $gte: startOfDay, $lte: endOfDay } });
    const totalReservations = await Reservation.countDocuments();
    const upcomingReservations = await Reservation.countDocuments({ status: "Confirmed" });

    res.json({ totalBookings, activeGuests, checkinsToday, checkoutsToday, totalReservations, upcomingReservations });
  } catch (error) {
    res.status(500).json({ message: "Error fetching booking stats", error });
  }
};

// ----------- Banquet Module Stats -----------
exports.getBanquetStats = async (req, res) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
      // Banquets booked for today
      const banquetToday = await BanquetBooking.countDocuments({
        startDate: { $gte: startOfDay, $lte: endOfDay }
      });
  
      // Banquets by status (using bookingStatus string enum)
      const banquetConfirmed = await BanquetBooking.countDocuments({ bookingStatus: "Confirmed" });
      const banquetTentative = await BanquetBooking.countDocuments({ bookingStatus: "Tentative" });
      const banquetEnquiry = await BanquetBooking.countDocuments({ bookingStatus: "Enquiry" });
  
      res.json({
        banquetToday,
        banquetConfirmed,
        banquetTentative,
        banquetEnquiry
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching banquet stats", error });
    }
  };

// ----------- Restaurant Module Stats -----------
exports.getRestaurantStats = async (req, res) => {
    try {
      // India timezone ke hisaab se today ka start and end
      const startOfDay = new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" }));
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);
  
      // Total restaurant orders
      const totalOrders = await RestaurantOrder.countDocuments();
  
      // Pending bills (paymentStatus: 'pending')
      const pendingBills = await Bill.countDocuments({ paymentStatus: "pending" });
  
      // Revenue today (sum of order amounts created today)
      const revenueTodayAgg = await RestaurantOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: { _id: null, total: { $sum: "$amount" } }
        }
      ]);
  
      // KOT stats
      const totalKOTs = await KOT.countDocuments();
      const preparingKOTs = await KOT.countDocuments({ status: "preparing" });
      const readyKOTs = await KOT.countDocuments({ status: "ready" });
      const servedKOTs = await KOT.countDocuments({ status: "served" });
  
      res.json({
        totalOrders,
        pendingBills,
        revenueToday: revenueTodayAgg[0]?.total || 0,
        totalKOTs,
        preparingKOTs,
        readyKOTs,
        servedKOTs
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching restaurant stats", error });
    }
  };
  

// ----------- Cab Module Stats -----------
exports.getCabStats = async (req, res) => {
    try {
      // India timezone ke hisaab se today ka start and end
      const startOfDay = new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" }));
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);
  
      // Status counts (ensure lowercase matching schema)
      const pending = await CabBooking.countDocuments({ status: "pending" });
      const confirmed = await CabBooking.countDocuments({ status: "confirmed" });
      const onRoute = await CabBooking.countDocuments({ status: "on_route" });
      const completed = await CabBooking.countDocuments({ status: "completed" });
      const cancelled = await CabBooking.countDocuments({ status: "cancelled" });
  
      // Today's bookings (pickupTime falls today)
      const todayBookings = await CabBooking.countDocuments({ 
        pickupTime: { $gte: startOfDay, $lte: endOfDay } 
      });
  
      res.json({
        pending,
        confirmed,
        onRoute,
        completed,
        cancelled,
        todayBookings
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching cab stats", error });
    }
  };
  

// controllers/laundryController.js

exports.getLaundryStats = async (req, res) => {
  try {
    // India timezone ke hisaab se today
    const startOfDay = new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" }));
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    // Status counts
    const pending = await Laundry.countDocuments({ laundryStatus: "pending" });
    const inProgress = await Laundry.countDocuments({ laundryStatus: "in_progress" });
    const partiallyDelivered = await Laundry.countDocuments({ laundryStatus: "partially_delivered" });
    const completed = await Laundry.countDocuments({ laundryStatus: "completed" });
    const cancelled = await Laundry.countDocuments({ laundryStatus: "cancelled" });

    // Total revenue (only completed orders)
    const totalRevenueAgg = await Laundry.aggregate([
      { $match: { laundryStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    // Revenue today (completed orders created today)
    const revenueTodayAgg = await Laundry.aggregate([
      { $match: { laundryStatus: "completed", createdAt: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    // Urgent orders
    const urgentOrders = await Laundry.countDocuments({ isUrgent: true });

    // Total orders
    const totalOrders = await Laundry.countDocuments();

    res.json({
      totalOrders,
      pending,
      inProgress,
      partiallyDelivered,
      completed,
      cancelled,
      urgentOrders,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      revenueToday: revenueTodayAgg[0]?.total || 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching laundry stats", error });
  }
};
