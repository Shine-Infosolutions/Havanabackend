const express = require('express');
const router = express.Router();
const {
  createConsumption,
  getAllConsumptions,
  getConsumptionById,
  deleteConsumption
} = require('../controllers/kitchenConsumptionController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware(['admin', 'staff', 'restaurant', 'chef']));

// Routes
router.post('/', createConsumption);
router.get('/', getAllConsumptions);
router.get('/:id', getConsumptionById);
router.delete('/:id', deleteConsumption);

module.exports = router;