const mongoose = require('mongoose');
const Room = require('./src/models/Room');
const Booking = require('./src/models/Booking');

// Connect to MongoDB
mongoose.connect('mongodb+srv://anshusharma42019:42019@cluster0.bubhmal.mongodb.net/Havana-Backend?retryWrites=true&w=majority&appName=Cluster0');

async function fixRoom122() {
  try {
    console.log('Checking room 122 status...');
    
    // Find room 122
    const room = await Room.findOne({ room_number: '122' });
    if (!room) {
      console.log('Room 122 not found');
      return;
    }
    
    console.log(`Room 122 current status: ${room.status}`);
    
    // Check for active bookings for room 122
    const activeBooking = await Booking.findOne({
      roomNumber: '122',
      status: { $in: ['Booked', 'Checked In'] },
      isActive: true
    });
    
    if (activeBooking) {
      console.log(`Active booking found for room 122: ${activeBooking.grcNo} - Status: ${activeBooking.status}`);
    } else {
      console.log('No active booking found for room 122');
      
      // Set room to available
      room.status = 'available';
      await room.save();
      console.log('Room 122 has been set to available');
    }
    
    // Check all bookings for room 122
    const allBookings = await Booking.find({ roomNumber: '122' }).sort({ createdAt: -1 });
    console.log('\nAll bookings for room 122:');
    allBookings.forEach(booking => {
      console.log(`- GRC: ${booking.grcNo}, Status: ${booking.status}, Active: ${booking.isActive}, Created: ${booking.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixRoom122();