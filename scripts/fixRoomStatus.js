const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Room = require('../src/models/Room');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/havana', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixRoomStatus() {
  try {
    console.log('Starting comprehensive room status fix...');
    
    // Get all rooms and bookings
    const [allRooms, allBookings] = await Promise.all([
      Room.find({}),
      Booking.find({ 
        isActive: true,
        deleted: { $ne: true }
      })
    ]);

    console.log(`Found ${allRooms.length} rooms and ${allBookings.length} active bookings`);

    let fixedRooms = 0;
    const currentDate = new Date();

    // Check each room's actual status
    for (const room of allRooms) {
      const roomNumber = room.room_number;
      
      // Find any active bookings for this room
      const activeBookings = allBookings.filter(booking => {
        if (!booking.roomNumber) return false;
        
        const roomNumbers = booking.roomNumber.split(',').map(num => num.trim());
        const hasThisRoom = roomNumbers.includes(roomNumber) || roomNumbers.includes(String(roomNumber));
        
        if (!hasThisRoom) return false;
        
        // Check if booking is currently active (dates and status)
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        const isDateActive = currentDate >= checkIn && currentDate <= checkOut;
        const isStatusActive = ['Booked', 'Checked In'].includes(booking.status);
        
        return isStatusActive && isDateActive;
      });

      // Determine correct room status
      const shouldBeBooked = activeBookings.length > 0;
      const currentStatus = room.status;
      const correctStatus = shouldBeBooked ? 'booked' : 'available';

      if (currentStatus !== correctStatus) {
        console.log(`Fixing Room ${roomNumber}: ${currentStatus} -> ${correctStatus}`);
        if (activeBookings.length > 0) {
          console.log(`  Active bookings: ${activeBookings.map(b => b.grcNo).join(', ')}`);
        }
        
        room.status = correctStatus;
        await room.save();
        fixedRooms++;
      }
    }

    // Also check for bookings with invalid room status
    let fixedBookings = 0;
    for (const booking of allBookings) {
      if (!booking.roomNumber) continue;
      
      const roomNumbers = booking.roomNumber.split(',').map(num => num.trim());
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      const isDateActive = currentDate >= checkIn && currentDate <= checkOut;
      const isStatusActive = ['Booked', 'Checked In'].includes(booking.status);
      
      if (isStatusActive && isDateActive) {
        // This booking should have its rooms marked as booked
        for (const roomNum of roomNumbers) {
          const room = allRooms.find(r => r.room_number === roomNum || String(r.room_number) === roomNum);
          if (room && room.status !== 'booked') {
            console.log(`Booking ${booking.grcNo} requires Room ${roomNum} to be booked`);
            room.status = 'booked';
            await room.save();
            fixedRooms++;
          }
        }
      } else if (!isStatusActive || !isDateActive) {
        // This booking should have its rooms marked as available
        for (const roomNum of roomNumbers) {
          const room = allRooms.find(r => r.room_number === roomNum || String(r.room_number) === roomNum);
          if (room && room.status === 'booked') {
            // Check if any other active booking uses this room
            const otherActiveBookings = allBookings.filter(otherBooking => {
              if (otherBooking._id.equals(booking._id)) return false;
              if (!otherBooking.roomNumber) return false;
              
              const otherRoomNumbers = otherBooking.roomNumber.split(',').map(num => num.trim());
              const hasThisRoom = otherRoomNumbers.includes(roomNum) || otherRoomNumbers.includes(String(roomNum));
              
              if (!hasThisRoom) return false;
              
              const otherCheckIn = new Date(otherBooking.checkInDate);
              const otherCheckOut = new Date(otherBooking.checkOutDate);
              const otherIsDateActive = currentDate >= otherCheckIn && currentDate <= otherCheckOut;
              const otherIsStatusActive = ['Booked', 'Checked In'].includes(otherBooking.status);
              
              return otherIsStatusActive && otherIsDateActive;
            });
            
            if (otherActiveBookings.length === 0) {
              console.log(`Booking ${booking.grcNo} no longer needs Room ${roomNum} - setting to available`);
              room.status = 'available';
              await room.save();
              fixedRooms++;
            }
          }
        }
      }
    }

    console.log(`Fixed ${fixedRooms} room status issues`);
    console.log('Room status fix completed successfully');
    
  } catch (error) {
    console.error('Error fixing room status:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixRoomStatus();