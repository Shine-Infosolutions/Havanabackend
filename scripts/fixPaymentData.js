const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/havana', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixPaymentData() {
  try {
    console.log('Starting payment data fix...');
    
    // Find all bookings with payment status 'Paid' but incorrect balance
    const bookings = await Booking.find({
      paymentStatus: 'Paid'
    });

    console.log(`Found ${bookings.length} paid bookings to check`);

    let fixedCount = 0;

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
          transactionId: `FIX_${Date.now()}`,
          paymentDate: booking.updatedAt || new Date(),
          status: 'Completed'
        });

        // Update totalAdvanceAmount
        booking.totalAdvanceAmount = totalAmount;

        await booking.save();
        fixedCount++;
      }
    }

    console.log(`Fixed ${fixedCount} bookings`);
    console.log('Payment data fix completed successfully');
    
  } catch (error) {
    console.error('Error fixing payment data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixPaymentData();