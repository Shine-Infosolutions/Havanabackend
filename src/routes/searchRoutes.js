const express = require('express');
const searchController = require('../controllers/searchController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Universal search across all models
router.get('/universal', authMiddleware(['admin', 'staff', 'restaurant']), searchController.universalSearch);

// Search by specific field
router.get('/field', authMiddleware(['admin', 'staff', 'restaurant']), searchController.searchByField);

module.exports = router;
