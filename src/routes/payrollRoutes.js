const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

// Generate payroll for a user
router.post('/generate', payrollController.generatePayroll);

module.exports = router;
