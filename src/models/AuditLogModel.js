const { getAuditConnection } = require('../config/auditDatabase');
const AuditLogSchema = require('./AuditLog').schema;

let AuditLogModel = null;

const getAuditLogModel = async () => {
  try {
    if (!AuditLogModel) {
      const auditConnection = await getAuditConnection();
      if (!auditConnection) {
        console.warn('⚠️ Audit database connection not available');
        return null;
      }
      AuditLogModel = auditConnection.model('AuditLog', AuditLogSchema);
    }
    return AuditLogModel;
  } catch (error) {
    console.error('❌ Error getting audit log model:', error.message);
    return null;
  }
};

module.exports = { getAuditLogModel };