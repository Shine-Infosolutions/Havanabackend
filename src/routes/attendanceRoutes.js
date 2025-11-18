const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// Clock in/out
router.post('/clock-in', attendanceController.clockIn);
router.post('/clock-out', attendanceController.clockOut);
router.post('/checkout-with-status', attendanceController.checkoutWithStatus);

// Manual attendance marking (admin)
router.post('/mark', attendanceController.markAttendance);

// Get attendance
router.get('/get', attendanceController.getAttendance);
router.get('/all', attendanceController.getAllAttendance);
router.get('/today/:staffId', attendanceController.getTodayAttendance);

// Staff Dashboard
router.get('/dashboard/:staffId', attendanceController.getStaffDashboard);
router.get('/monthly-report/:staffId', attendanceController.getMonthlyReport);

// Update attendance
router.patch('/update', attendanceController.updateAttendance);

module.exports = router;
