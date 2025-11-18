const express = require('express');
const {
  createPayment,
  getAllPayments,
  getPaymentsByService,
  getTotalPaidAmount
} = require('../controllers/paymentController');

const router = express.Router();


router.post('/', createPayment);


router.get('/all', getAllPayments);


router.get('/:sourceType/:sourceId', getPaymentsByService);

router.get('/total/:sourceType/:sourceId', getTotalPaidAmount);

module.exports = router;
