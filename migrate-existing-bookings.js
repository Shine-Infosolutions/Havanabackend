const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/havana', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateExistingBookings() {
  try {
    console.log('Starting migration of existing bookings...');
    
    // Find all bookings that need migration
    const bookings = await Booking.find({
      $or: [
        { roomRates: { $exists: false } },
        { 'roomRates.extraBedStartDate': { $exists: false } }
      ]
    });

    console.log(`Found ${bookings.length} bookings to migrate`);

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
        console.log(`Migrated booking ${booking.grcNo}`);
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateExistingBookings();