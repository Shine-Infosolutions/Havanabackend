const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Create a new category
router.post('/add', categoryController.createCategory);

// Get all categories
router.get('/all', categoryController.getCategories);

// Get a category by ID
router.get('/get/:id', categoryController.getCategoryById);

// Update a category
router.put('/update/:id', categoryController.updateCategory);

// Delete a category
router.delete('/delete/:id', categoryController.deleteCategory);

module.exports = router; 
