const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Create purchase order
router.post('/orders', authMiddleware(['admin', 'staff']), purchaseOrderController.createPurchaseOrder);

// Get all purchase orders
router.get('/orders', authMiddleware(['admin', 'staff']), purchaseOrderController.getAllPurchaseOrders);

// Update order status
router.put('/orders/:orderId/status', authMiddleware(['admin', 'staff']), purchaseOrderController.updateOrderStatus);

// Receive purchase order
router.post('/orders/:orderId/receive', authMiddleware(['admin', 'staff']), purchaseOrderController.receivePurchaseOrder);

// Get low stock items
router.get('/low-stock', authMiddleware(['admin', 'staff']), purchaseOrderController.getLowStockItems);

module.exports = router;
