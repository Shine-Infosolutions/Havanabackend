const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Get all inventory items
router.get('/items', inventoryController.getAllItems);

// Create new inventory item
router.post('/items', inventoryController.createItem);

// Update inventory item
router.put('/items/:id', inventoryController.updateItem);

// Delete inventory item
router.delete('/items/:id', inventoryController.deleteItem);

// Get items by category
router.get('/category/:category', inventoryController.getByCategory);

// Stock operations
router.post('/items/:id/stock-in', inventoryController.stockIn);
router.post('/items/:id/stock-out', inventoryController.stockOut);
router.put('/items/:id/stock', inventoryController.updateStock);

// Stock movements and alerts
router.get('/movements', inventoryController.getStockMovements);
router.get('/low-stock', inventoryController.getLowStockItems);
router.get('/search', inventoryController.searchItems);

module.exports = router;