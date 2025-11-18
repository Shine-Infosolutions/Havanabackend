const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Send order ready notification
router.post('/order-ready', authMiddleware(), notificationController.sendOrderReadyNotification);

// Get my notifications
router.get('/my-notifications', authMiddleware(), notificationController.getMyNotifications);

// Mark notification as read
router.patch('/:id/read', authMiddleware(), notificationController.markAsRead);

module.exports = router;
