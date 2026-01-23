const Booking = require('../models/Booking');
const Room = require('../models/Room');

const fixRoomStatus = async (req, res) => {
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
    const fixedRoomsList = [];

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
        
        room.status = correctStatus;
        await room.save();
        fixedRooms++;
        
        fixedRoomsList.push({
          roomNumber,
          oldStatus: currentStatus,
          newStatus: correctStatus,
          activeBookings: activeBookings.map(b => b.grcNo)
        });
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixedRooms} room status issues`,
      fixedRooms,
      fixedRoomsList
    });
    
  } catch (error) {
    console.error('Error fixing room status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing room status',
      error: error.message
    });
  }
};

module.exports = { fixRoomStatus };