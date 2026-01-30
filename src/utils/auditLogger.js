const { getAuditLogModel } = require('../models/AuditLogModel');
const mongoose = require('mongoose');

// Helper function to create audit log (non-blocking)
const createAuditLog = (action, module, recordId, userId, userRole, oldData, newData, req) => {
  // Run asynchronously without blocking main operation
  setImmediate(async () => {
    try {
      const AuditLog = await getAuditLogModel();
      if (!AuditLog) {
        console.warn(`⚠️ Audit logging unavailable for ${module} ${action} - database connection not ready`);
        return;
      }

      const auditData = {
        action,
        module,
        recordId: recordId.toString(),
        userId: userId || new mongoose.Types.ObjectId(),
        userRole: userRole || 'SYSTEM',
        oldData,
        newData,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get('User-Agent')
      };

      await AuditLog.create(auditData);
      console.log(`✅ Audit log created: ${action} for ${module} ${recordId}`);
    } catch (error) {
      console.error(`❌ Audit log creation failed for ${module} ${action}:`, error.message);
      console.error('Full error:', error);
    }
  });
};

module.exports = { createAuditLog };