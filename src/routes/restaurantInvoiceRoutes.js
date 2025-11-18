const express = require('express');
const router = express.Router();
const { 
  saveRestaurantInvoice, 
  getRestaurantInvoice 
} = require('../controllers/restaurantInvoiceController');

// Restaurant invoice routes
router.post('/save', saveRestaurantInvoice);
router.get('/:orderId', getRestaurantInvoice);

module.exports = router;