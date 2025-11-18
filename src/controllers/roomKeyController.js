const RoomKey = require("../models/Roomkey");
const Booking = require("../models/Booking");

// ✅ Issue new Room Key (on Check-in)
exports.issueRoomKey = async (req, res) => {
  try {
    const { bookingId, roomId, rfidUID } = req.body;

    // Booking validate karo
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Card create
    const roomKey = await RoomKey.create({
      bookingId,
      roomId,
      rfidUID,
      expiresAt: booking.timeOut, // expiry = booking checkout time
      usageCount: 0, // ✅ start from zero
    });

    res.status(201).json({
      success: true,
      message: "Room key issued successfully",
      data: roomKey,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ✅ Use Room Key (when guest taps card on door lock)
exports.useRoomKey = async (req, res) => {
  try {
    const { rfidUID } = req.body;

    const key = await RoomKey.findOne({ rfidUID, isActive: true });
    if (!key) {
      return res.status(404).json({ message: "Key not found or inactive" });
    }

    // Expiry check
    if (new Date() > key.expiresAt) {
      return res.status(403).json({ message: "Key expired" });
    }

    // ✅ Usage increment
    key.usageCount += 1;
    await key.save();

    res.json({
      success: true,
      message: "Access granted",
      roomId: key.roomId,
      usageCount: key.usageCount, // ✅ return updated count
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ✅ Deactivate Key (on Checkout or Lost card)
exports.deactivateRoomKey = async (req, res) => {
  try {
    const { rfidUID } = req.body;

    const key = await RoomKey.findOne({ rfidUID });
    if (!key) {
      return res.status(404).json({ message: "Key not found" });
    }

    key.isActive = false;
    await key.save();

    res.json({
      success: true,
      message: "Room key deactivated",
      data: key,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ✅ Get all active keys (admin/staff use)
exports.getActiveKeys = async (req, res) => {
  try {
    const keys = await RoomKey.find({ isActive: true }).populate("bookingId roomId");
    res.json({ success: true, data: keys });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ✅ Get usage count for a specific key
exports.getKeyUsage = async (req, res) => {
  try {
    const { rfidUID } = req.params;

    const key = await RoomKey.findOne({ rfidUID });
    if (!key) {
      return res.status(404).json({ message: "Key not found" });
    }

    res.json({
      success: true,
      rfidUID: key.rfidUID,
      roomId: key.roomId,
      usageCount: key.usageCount, // ✅ kitni baar use hua
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
