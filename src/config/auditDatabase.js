const mongoose = require('mongoose');

// Separate connection for audit logs
let auditConnection = null;

const connectAuditDB = async () => {
  try {
    if (auditConnection && auditConnection.readyState === 1) {
      return auditConnection;
    }

    // Use separate database for audit logs
    const auditDbUri = process.env.AUDIT_MONGO_URI || 
      process.env.MONGO_URI?.replace('/havna', '/hotel_logs') || 
      'mongodb+srv://hh:havana@cluster0.renncp4.mongodb.net/hotel_logs?retryWrites=true&w=majority';

    console.log('Connecting to audit database...');
    
    auditConnection = mongoose.createConnection(auditDbUri, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 3000,
      maxPoolSize: 3,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      retryWrites: true,
      w: 'majority',
      family: 4
    });

    // Wait for connection with timeout (non-blocking)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️ Audit database connection timeout - continuing without audit');
        resolve(null);
      }, 3000);
      
      auditConnection.once('connected', () => {
        clearTimeout(timeout);
        console.log('✅ Audit database connected successfully');
        resolve(auditConnection);
      });
      
      auditConnection.once('error', (err) => {
        clearTimeout(timeout);
        console.error('❌ Audit database connection error:', err.message);
        resolve(null);
      });
    });

    auditConnection.on('disconnected', () => {
      console.log('⚠️ Audit database disconnected');
      auditConnection = null;
    });

    return auditConnection;
  } catch (error) {
    console.error('Failed to connect to audit database:', error.message);
    if (auditConnection) {
      auditConnection.close();
      auditConnection = null;
    }
    throw error;
  }
};

const getAuditConnection = async () => {
  if (!auditConnection || auditConnection.readyState !== 1) {
    try {
      auditConnection = await connectAuditDB();
    } catch (error) {
      console.error('Failed to get audit connection:', error.message);
      return null; // Return null instead of throwing error
    }
  }
  return auditConnection;
};

module.exports = {
  connectAuditDB,
  getAuditConnection
};