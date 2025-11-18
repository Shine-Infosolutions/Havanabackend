const express = require('express');
const paginationController = require('../controllers/paginationController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Generic pagination route
router.get('/:model', authMiddleware(['admin', 'staff', 'restaurant']), paginationController.getPaginatedData);

// Filtered pagination route
router.post('/:model/filter', authMiddleware(['admin', 'staff', 'restaurant']), paginationController.getFilteredPaginatedData);

module.exports = router;
