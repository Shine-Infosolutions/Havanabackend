const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const auditHealthController = require('../controllers/auditHealthController');

// Health check for audit system
router.get('/health', auditHealthController.auditHealthCheck);

// Get audit statistics
router.get('/stats', auditHealthController.getAuditStats);

// Get all audit logs
router.get('/logs', auditController.getAuditLogs);

// Get audit logs by module (e.g., /audit/logs/Booking)
router.get('/logs/:module', auditController.getAuditLogsByModule);

// Get audit logs by record ID
router.get('/logs/record/:recordId', auditController.getAuditLogsByRecord);

module.exports = router;