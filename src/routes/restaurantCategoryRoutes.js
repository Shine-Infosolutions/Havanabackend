const express = require('express');
const restaurantCategoryController = require('../controllers/restaurantCategoryController');

const router = express.Router();

router.get('/all', restaurantCategoryController.getAllCategories);
router.post('/add', restaurantCategoryController.createCategory);
router.get('/get/:id', restaurantCategoryController.getCategoryById);
router.put('/update/:id', restaurantCategoryController.updateCategory);
router.delete('/delete/:id', restaurantCategoryController.deleteCategory);

module.exports = router;
