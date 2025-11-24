const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Find bookings that need migration
    const bookings = await Booking.find({
      $or: [
        { roomRates: { $exists: false } },
        { 'roomRates.extraBedStartDate': { $exists: false } }
      ]
    });

    let migratedCount = 0;

    for (const booking of bookings) {
      let updated = false;

      // Initialize roomRates if it doesn't exist
      if (!booking.roomRates || booking.roomRates.length === 0) {
        const roomNumbers = booking.roomNumber ? booking.roomNumber.split(',').map(r => r.trim()) : [];
        booking.roomRates = roomNumbers.map(roomNumber => ({
          roomNumber: roomNumber,
          customRate: booking.rate ? (booking.rate / roomNumbers.length / (booking.days || 1)) : 0,
          extraBed: booking.extraBedRooms ? booking.extraBedRooms.includes(roomNumber) : false,
          extraBedStartDate: booking.extraBedRooms && booking.extraBedRooms.includes(roomNumber) ? booking.checkInDate : null
        }));
        updated = true;
      } else {
        // Add missing extraBedStartDate to existing roomRates
        booking.roomRates = booking.roomRates.map(rate => ({
          ...rate,
          extraBedStartDate: rate.extraBedStartDate || (rate.extraBed ? booking.checkInDate : null)
        }));
        updated = true;
      }

      if (updated) {
        await booking.save();
        migratedCount++;
      }
    }

    res.json({
      success: true,
      message: `Migrated ${migratedCount} bookings`,
      migratedCount
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
}