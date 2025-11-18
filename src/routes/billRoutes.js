const express = require('express');
const billController = require('../controllers/billController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', authMiddleware(['admin', 'restaurant']), billController.createBill);
router.patch('/:id/payment', authMiddleware(['admin', 'restaurant']), billController.processPayment);
router.patch('/:id/split-payment', authMiddleware(['admin', 'restaurant']), billController.processSplitPayment);
router.patch('/:id/status', authMiddleware(['admin', 'restaurant']), billController.updateBillStatus);
router.get('/all', authMiddleware(['admin', 'restaurant']), billController.getAllBills);
router.get('/:id/advance-details', authMiddleware(['admin', 'restaurant']), billController.getBillWithAdvanceDetails);
router.get('/:id', authMiddleware(['admin', 'restaurant']), billController.getBillById);

module.exports = router;
