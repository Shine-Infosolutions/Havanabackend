const express = require('express');
const router = express.Router();
const roomServiceController = require('../controllers/roomServiceController');
const { auth } = require('../middleware/auth');

// Create room service order
router.post('/create', auth, roomServiceController.createOrder);

// Get all orders
router.get('/all', auth, roomServiceController.getAllOrders);

// Get order by ID
router.get('/:id', auth, roomServiceController.getOrderById);

// Update order status
router.patch('/:id/status', auth, roomServiceController.updateOrderStatus);

// Update payment status
router.patch('/:id/payment', auth, roomServiceController.updatePaymentStatus);

// Generate KOT
router.post('/:id/kot', auth, roomServiceController.generateKOT);

// Generate Bill
router.post('/:id/bill', auth, roomServiceController.generateBill);

// Bill lookup
router.get('/lookup/bills', auth, roomServiceController.billLookup);

// Get room service charges for checkout
router.get('/charges/checkout', auth, roomServiceController.getRoomServiceCharges);

// Mark orders as paid
router.post('/mark-paid', auth, roomServiceController.markOrdersPaid);

// Delete order
router.delete('/:id', auth, roomServiceController.deleteOrder);

module.exports = router;