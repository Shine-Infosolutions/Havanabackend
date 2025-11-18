const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getCashAtReception,
  addCashTransaction,
  getAllCashTransactions,
  generateCashTransactionsExcel
} = require('../controllers/cashTransactionController');

// 🧾 Get filtered cash summary (today, week, month, year, date, source)
router.get('/cash-at-reception', authMiddleware(['admin', 'staff'], ['accounts']), getCashAtReception);

// 📋 Get all cash transactions (unfiltered list)
router.get('/all-transactions', authMiddleware(['admin', 'staff'], ['accounts']), getAllCashTransactions);

// ➕ Add a new cash transaction
router.post('/add-transaction', authMiddleware(['admin', 'staff'], ['accounts']), addCashTransaction);

// 📊 Generate Excel report for cash transactions
router.get('/excel-report', authMiddleware(['admin', 'staff'], ['accounts']), generateCashTransactionsExcel);

module.exports = router;
