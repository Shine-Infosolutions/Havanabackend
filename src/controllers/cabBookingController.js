const CabBooking = require('../models/cabBooking');
const Room = require('../models/Room');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

// ── Create a new cab booking ─────────────────────────────────────────────
exports.createCabBooking = async (req, res) => {
  try {
    const {
      purpose = 'guest_transport',
      guestName,
      roomNumber,
      bookingId, 
      grcNo,
      guestType = 'inhouse',
      pickupLocation,
      destination,
      pickupTime,
      cabType = 'standard',
      specialInstructions,
      scheduled = false,
      vehicleId,
      driverId,
    } = req.body;

    // Validate required fields
    if (!pickupLocation) 
      return res.status(400).json({ error: 'Pickup location is required' });
    if (!destination) 
      return res.status(400).json({ error: 'Destination is required' });
    if (!pickupTime) 
      return res.status(400).json({ error: 'Pickup time is required' });

    // Validate pickupTime
    const pickupDate = new Date(pickupTime);
    if (isNaN(pickupDate.getTime())) {
      return res.status(400).json({ error: 'Invalid pickup time format' });
    }

    // Validate roomNumber if provided
    if (roomNumber !== undefined && roomNumber !== null) {
      if (typeof roomNumber !== 'string') {
        return res.status(400).json({ error: 'roomNumber must be a string' });
      }

      // Optional: Trim and query room
      const roomTrimmed = roomNumber.trim();
      // Using regex to avoid mismatch due to whitespace or case
      const room = await Room.findOne({ room_number: { $regex: `^${roomTrimmed}$`, $options: 'i' } });
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
    }

    // Validate driverId if provided
    let driverName = '';
    if (driverId) {
      if (!driverId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'Invalid driverId' });
      }
      const driver = await Driver.findById(driverId);
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }
      driverName = driver.driverName || '';
    }

    // Validate vehicleId if provided
    let vehicleNumber = '';
    if (vehicleId) {
      if (!vehicleId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'Invalid vehicleId' });
      }
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      vehicleNumber = vehicle.vehicleNumber || '';
    }

    // Create new booking
    const booking = new CabBooking({
      purpose,
      guestName,
      roomNumber,
      grcNo,
      bookingId,
      guestType,
      pickupLocation,
      destination,
      pickupTime: pickupDate,
      cabType,
      specialInstructions,
      scheduled,
      vehicleId,
      vehicleNumber, // snapshot
      driverId,
      driverName, // snapshot
      status: 'pending',
    });

    await booking.save();

    return res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error("Error creating cab booking:", error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
};

// ── Get all cab bookings ─────────────────────────────────────────────────
exports.getAllCabBookings = async (req, res) => {
  try {
    const { status, purpose } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;

    const bookings = await CabBooking.find(filter)
      .populate('driverId', 'name contactNumber') // optional
      .sort({ pickupTime: 1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Get a single cab booking by ID ────────────────────────────────────────
exports.getCabBookingById = async (req, res) => {
  try {
    const booking = await CabBooking.findById(req.params.id)
      .populate('driverId', 'name contactNumber');

    if (!booking) return res.status(404).json({ success: false, error: 'Cab booking not found' });
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Update any fields on a booking ───────────────────────────────────────
exports.updateCabBooking = async (req, res) => {
  try {
    const updates = { ...req.body };

    // If driverId is being updated, update driverName snapshot
    if (updates.driverId) {
      const driver = await Driver.findById(updates.driverId);
      if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });
      updates.driverName = driver.name;
    }

    const updated = await CabBooking.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ success: false, error: 'Booking not found' });
    res.json({ success: true, booking: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ── Cancel a booking ─────────────────────────────────────────────────────
exports.cancelCabBooking = async (req, res) => {
  try {
    const updates = {
      status: 'cancelled',
      cancellationReason: req.body.cancellationReason || 'No reason provided'
    };

    const cancelled = await CabBooking.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!cancelled) return res.status(404).json({ success: false, error: 'Booking not found' });

    res.json({ success: true, booking: cancelled });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Delete a booking permanently ─────────────────────────────────────────
exports.deleteCabBooking = async (req, res) => {
  try {
    const deleted = await CabBooking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Booking not found' });

    res.json({ success: true, message: 'Cab booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Get bookings by Driver ID (optional filter) ──────────────────────────
exports.getCabBookingsByDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const bookings = await CabBooking.find({ driverId }).sort({ pickupTime: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
