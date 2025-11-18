const Reservation = require('../models/Reservation.js');
const Room = require('../models/Room.js');
const Bookings = require('../models/Booking.js'); 

// Generate unique GRC number
const generateGRC = async () => {
  let grcNo, exists = true;
  while (exists) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    grcNo = `GRC-${rand}`;
    exists = await Reservation.findOne({ grcNo });
  }
  return grcNo;
};

// 🔹 Create a new reservation
exports.createReservation = async (req, res) => {
  try {
    const grcNo = await generateGRC();
    const reservation = new Reservation({
      grcNo,
      ...req.body,
    });

    // Optional: auto-update room status if assigned
    if (reservation.roomAssigned) {
      await Room.findByIdAndUpdate(reservation.roomAssigned, { status: 'reserved' });
    }

    await reservation.save();
    res.status(201).json({ success: true, reservation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 🔹 Get all reservations
exports.getAllReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('category')
      .populate('roomAssigned')
      .sort({ createdAt: -1 });
      
    // Map reservations to ensure safe access to populated fields
    const safeReservations = reservations.map(reservation => {
      const resObj = reservation.toObject();
      if (!resObj.category) {
        resObj.category = { name: 'Unknown' };
      }
      return resObj;
    });
      
    res.json({ success: true, reservations: safeReservations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Get reservation by ID
exports.getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('category')
      .populate('roomAssigned');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    // Ensure safe access to populated fields
    const safeReservation = reservation.toObject();
    if (!safeReservation.category) {
      safeReservation.category = { name: 'Unknown' };
    }
    
    res.json({ success: true, reservation: safeReservation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Get reservation by GRC number
exports.getReservationByGRC = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ grcNo: req.params.grcNo })
      .populate('category')
      .populate('roomAssigned');
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    // Ensure safe access to populated fields
    const safeReservation = reservation.toObject();
    if (!safeReservation.category) {
      safeReservation.category = { name: 'Unknown' };
    }
    
    res.json({ success: true, reservation: safeReservation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Update reservation
exports.updateReservation = async (req, res) => {
  try {
    const updated = await Reservation.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    res.json({ success: true, reservation: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// 🔹 Cancel reservation
exports.cancelReservation = async (req, res) => {
  try {
    const { cancellationReason, cancelledBy } = req.body;
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    reservation.status = 'Cancelled';
    reservation.cancellationReason = cancellationReason;
    reservation.cancelledBy = cancelledBy;

    if (reservation.roomAssigned) {
      await Room.findByIdAndUpdate(reservation.roomAssigned, { status: 'available' });
    }

    await reservation.save();
    res.json({ success: true, message: 'Reservation cancelled', reservation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Mark as No-Show
exports.markNoShow = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled', isNoShow: true },
      { new: true }
    );
    res.json({ success: true, message: 'Marked as No-Show', reservation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🔹 Delete reservation (hard delete)
exports.deleteReservation = async (req, res) => {
  try {
    const deleted = await Reservation.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    res.json({ success: true, message: 'Reservation deleted permanently' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🔹 Link Reservation to Check-In
exports.linkToCheckIn = async (req, res) => {
  try {
    const { checkInId } = req.body;
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    reservation.linkedCheckInId = checkInId;
    reservation.status = 'Confirmed';
    await reservation.save();

    res.json({ success: true, message: 'Check-in linked successfully', reservation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
