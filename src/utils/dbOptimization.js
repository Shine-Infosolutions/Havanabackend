const mongoose = require('mongoose');

// Database optimization function to create indexes
const optimizeDatabase = async () => {
  try {
    const db = mongoose.connection.db;
    
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
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

module.exports = { optimizeDatabase };