const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { auth, authorize } = require('../middleware/auth');

// Get all invoices (Admin, Accounts, GM)
router.get('/all', auth, authorize(['ADMIN', 'ACCOUNTS', 'GM']), invoiceController.getAllInvoices);

// Create invoice (Admin, Front Desk, Accounts)
router.post('/create', auth, authorize(['ADMIN', 'FRONT DESK', 'ACCOUNTS']), invoiceController.createInvoice);

// Update invoice (Admin, Accounts)
router.put('/update/:id', auth, authorize(['ADMIN', 'ACCOUNTS']), invoiceController.updateInvoice);

// Delete invoice (Admin only)
router.delete('/delete/:id', auth, authorize(['ADMIN']), invoiceController.deleteInvoice);

// Check invoice status (Front Desk, Staff, Admin)
router.get('/next-invoice-number', auth, authorize(['ADMIN', 'FRONT DESK', 'STAFF']), invoiceController.getNextInvoiceNumber);

module.exports = router;