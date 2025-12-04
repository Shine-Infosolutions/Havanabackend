const express = require('express');
const router = express.Router();
const inventoryCategoryController = require('../controllers/inventoryCategoryController');
const { auth, authorize } = require('../middleware/auth');

// Create a new inventory category (Admin, GM)
router.post('/add', auth, authorize(['ADMIN', 'GM', 'ACCOUNTS', 'STAFF', 'FRONT DESK']), inventoryCategoryController.createInventoryCategory);

// Get all inventory categories (All roles)
router.get('/all', auth, authorize(['ADMIN', 'GM', 'ACCOUNTS', 'STAFF', 'FRONT DESK']), inventoryCategoryController.getInventoryCategories);

// Get an inventory category by ID (All roles)
router.get('/get/:id', auth, authorize(['ADMIN', 'GM', 'ACCOUNTS', 'STAFF', 'FRONT DESK']), inventoryCategoryController.getInventoryCategoryById);

// Update an inventory category (Admin, GM)
router.put('/update/:id', auth, authorize(['ADMIN', 'GM','FRONT DESK']), inventoryCategoryController.updateInventoryCategory);

// Delete an inventory category (Admin only)
router.delete('/delete/:id', auth, authorize('ADMIN'), inventoryCategoryController.deleteInventoryCategory);

module.exports = router;