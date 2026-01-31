const mongoose = require('mongoose');

// Database optimization function to create indexes
const optimizeDatabase = async () => {
  try {
    // Wait for connection to be ready
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database instance not available');
    }
    
    // Booking collection indexes
    await db.collection('bookings').createIndex({ deleted: 1, status: 1 });
    await db.collection('bookings').createIndex({ deleted: 1, createdAt: -1 });
    await db.collection('bookings').createIndex({ deleted: 1, paymentMode: 1 });
    await db.collection('bookings').createIndex({ deleted: 1, checkInDate: 1 });
    await db.collection('bookings').createIndex({ deleted: 1, checkOutDate: 1 });
    
    // Room collection indexes
    await db.collection('rooms').createIndex({ deleted: 1, status: 1 });
    await db.collection('rooms').createIndex({ categoryId: 1 });
    
    // Restaurant orders indexes
    await db.collection('restaurantorders').createIndex({ deleted: 1 });
    await db.collection('restaurantorders').createIndex({ createdAt: -1 });
    
    // Laundry orders indexes
    await db.collection('laundries').createIndex({ deleted: 1 });
    await db.collection('laundries').createIndex({ createdAt: -1 });
    
    // Silently create indexes
  } catch (error) {
    // Silently fail
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error creating indexes:', error.message);
    }
  }
};

module.exports = { optimizeDatabase };