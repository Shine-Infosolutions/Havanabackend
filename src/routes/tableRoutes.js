const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get all tables
router.get('/tables', authMiddleware(['admin', 'staff', 'restaurant']), tableController.getAllTables);

// Create table
router.post('/tables', authMiddleware(['admin']), tableController.createTable);

// Update table
router.put('/tables/:tableId', authMiddleware(['admin']), tableController.updateTable);

// Update table status
router.patch('/tables/:tableId/status', authMiddleware(['admin', 'staff', 'restaurant']), tableController.updateTableStatus);

// Update table status by table number
router.patch('/tables/status', authMiddleware(['admin', 'staff', 'restaurant']), tableController.updateTableStatusByNumber);

// Delete table
router.delete('/tables/:tableId', authMiddleware(['admin']), tableController.deleteTable);

module.exports = router;
