const express = require('express');
const restaurantOrderController = require('../controllers/restaurantOrderController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/details/:id', restaurantOrderController.getOrderDetails);
router.get('/table/:tableNo', restaurantOrderController.getOrdersByTable);
router.get('/invoice/:id', restaurantOrderController.generateInvoice);
router.get('/all', restaurantOrderController.getAllOrders);
router.post('/create', restaurantOrderController.createOrder);
router.patch('/:id/add-items', authMiddleware(['admin', 'staff', 'restaurant']), restaurantOrderController.addItemsToOrder);
router.patch('/:id/transfer-table', authMiddleware(['admin', 'staff', 'restaurant']), restaurantOrderController.transferTable);
router.patch('/:id/add-transaction', authMiddleware(['admin', 'staff', 'restaurant']), restaurantOrderController.addTransaction);
router.patch('/:id/status', authMiddleware(['admin', 'staff', 'restaurant']), restaurantOrderController.updateOrderStatus);


module.exports = router;
