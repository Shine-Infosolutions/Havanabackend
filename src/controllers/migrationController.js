const Booking = require('../models/Booking');

const fixPaymentData = async (req, res) => {
  try {
    console.log('Starting payment data fix...');
    
    // Find all bookings with payment status 'Paid' but incorrect balance
    const bookings = await Booking.find({
      paymentStatus: 'Paid'
    });

    console.log(`Found ${bookings.length} paid bookings to check`);

    let fixedCount = 0;
    const fixedBookings = [];

    for (const booking of bookings) {
      const totalAmount = booking.netAmount || 0;
      const currentAdvanceTotal = booking.advancePayments.reduce((sum, payment) => sum + payment.amount, 0);
      const balanceDue = totalAmount - currentAdvanceTotal;

      // If balance due is not 0 for a paid booking, fix it
      if (balanceDue > 0) {
        console.log(`Fixing booking ${booking._id}: Balance due ${balanceDue}`);
        
        // Add the missing payment to advancePayments
        booking.advancePayments.push({
          amount: balanceDue,
          paymentMethod: 'Unknown', // Default for old data
          transactionId: `FIX_${Date.now()}_${booking._id}`,
          paymentDate: booking.updatedAt || new Date(),
          status: 'Completed'
        });

        // Update totalAdvanceAmount
        booking.totalAdvanceAmount = totalAmount;

        await booking.save();
        fixedCount++;
        fixedBookings.push({
          bookingId: booking._id,
          guestName: booking.guestName,
          fixedAmount: balanceDue
        });
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixedCount} bookings`,
      fixedBookings
    });
    
  } catch (error) {
    console.error('Error fixing payment data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing payment data',
      error: error.message
    });
  }
};

module.exports = { fixPaymentData };