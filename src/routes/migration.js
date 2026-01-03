const express = require('express');
const { fixPaymentData } = require('../controllers/migrationController');

const router = express.Router();

// Fix payment data for existing bookings
router.post('/fix-payment-data', fixPaymentData);

module.exports = router;