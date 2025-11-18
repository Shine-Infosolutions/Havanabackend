const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');

// Generate salary
router.post('/generate', salaryController.generateSalary);

// Update salary
router.put('/update/:salaryId', salaryController.updateSalary);

// Mark salary as paid
router.patch('/mark-paid/:salaryId', salaryController.markSalaryPaid);

// Get salaries with filters
router.get('/get', salaryController.getSalaries);

// Get salary slip
router.get('/slip/:salaryId', salaryController.getSalarySlip);

// Calculate deductions based on attendance
router.post('/calculate-deductions', salaryController.calculateDeductions);

// Get staff salary history
router.get('/history/:staffId', salaryController.getStaffSalaryHistory);

module.exports = router;