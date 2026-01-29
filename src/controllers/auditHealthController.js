const { getAuditLogModel } = require('../models/AuditLogModel');
const mongoose = require('mongoose');

// Helper function to create audit log
const createAuditLog = async (action, recordId, userId, userRole, oldData, newData, req) => {
  try {
    const AuditLog = await getAuditLogModel();
    await AuditLog.create({
      action,
      module: 'SYSTEM',
      recordId,
      userId: userId || new mongoose.Types.ObjectId(),
      userRole: userRole || 'SYSTEM',
      oldData,
      newData,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent')
    });
  } catch (error) {
    console.error('❌ Audit log creation failed:', error);
  }
};

// Health check for audit system
exports.auditHealthCheck = async (req, res) => {
  try {
    const AuditLog = await getAuditLogModel();
    
    if (!AuditLog) {
      return res.status(503).json({
        status: 'unhealthy',
        message: 'Audit database connection not available',
        auditLogging: false
      });
    }

    // Test creating a health check log
    await createAuditLog('CREATE', 'health-check', 'SYSTEM', 'SYSTEM', null, { healthCheck: true, timestamp: new Date() }, req);

    // Get recent logs count
    const recentLogsCount = await AuditLog.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      status: 'healthy',
      message: 'Audit system is working properly',
      auditLogging: true,
      recentLogsCount,
      lastChecked: new Date()
    });

  } catch (error) {
    console.error('❌ Audit health check failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Audit health check failed',
      error: error.message,
      auditLogging: false
    });
  }
};

// Get audit statistics
exports.getAuditStats = async (req, res) => {
  try {
    const AuditLog = await getAuditLogModel();
    
    if (!AuditLog) {
      return res.status(503).json({
        error: 'Audit service unavailable',
        message: 'Audit database connection not available'
      });
    }

    const stats = await AuditLog.aggregate([
      {
        $group: {
          _id: {
            module: '$module',
            action: '$action'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.module',
          actions: {
            $push: {
              action: '$_id.action',
              count: '$count'
            }
          },
          totalCount: { $sum: '$count' }
        }
      }
    ]);

    const totalLogs = await AuditLog.countDocuments();
    const recentLogs = await AuditLog.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      stats: {
        totalLogs,
        recentLogs,
        moduleStats: stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching audit stats:', error.message);
    res.status(500).json({ error: error.message });
  }
};