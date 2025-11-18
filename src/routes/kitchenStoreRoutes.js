const express = require('express');
const router = express.Router();
const kitchenStoreController = require('../controllers/kitchenStoreController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get all kitchen store items
router.get('/items', authMiddleware(['admin', 'staff', 'restaurant']), kitchenStoreController.getItems);

// Create kitchen store item
router.post('/items', authMiddleware(['admin', 'staff', 'restaurant']), kitchenStoreController.createItem);

// Update kitchen store item
router.put('/items/:id', authMiddleware(['admin', 'staff', 'restaurant']), kitchenStoreController.updateItem);

// Take out items from kitchen store
router.post('/take-out', authMiddleware(['admin', 'staff', 'restaurant']), kitchenStoreController.takeOutItems);

// Create order for out of stock item
router.post('/order/:id', authMiddleware(['admin', 'staff', 'restaurant']), kitchenStoreController.createOrder);

// Delete kitchen store item
router.delete('/items/:id', authMiddleware(['admin', 'staff', 'restaurant']), kitchenStoreController.deleteItem);

module.exports = router;
