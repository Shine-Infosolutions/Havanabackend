const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

// Create checkout
router.post('/create', checkoutController.createCheckout);

// Get checkout by booking ID
router.get('/booking/:bookingId', checkoutController.getCheckout);

// Update payment status
router.put('/:id/payment', checkoutController.updatePaymentStatus);

// Get invoice by checkout ID
router.get('/:id/invoice', checkoutController.getInvoice);

module.exports = router;
