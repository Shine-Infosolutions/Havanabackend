const express = require('express');
const router = express.Router();
const pantryCategoryController = require('../controllers/pantryCategoryController');
const { authMiddleware } = require('../middleware/authMiddleware');

// 📝 Routes for Pantry Category

// Get all categories
router.get('/all', authMiddleware(['admin', 'staff', 'pantry']), pantryCategoryController.getAllCategories);

// Add new category
router.post('/add', authMiddleware(['admin', 'staff', 'pantry']), pantryCategoryController.addCategory);

// Update category by ID
router.put('/update/:id', authMiddleware(['admin', 'staff', 'pantry']), pantryCategoryController.updateCategory);

// Delete category by ID
router.delete('/delete/:id', authMiddleware(['admin']), pantryCategoryController.deleteCategory);

module.exports = router;
