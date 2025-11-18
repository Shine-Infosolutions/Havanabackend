const express = require('express');
const router = express.Router();
const housekeepingController = require('../controllers/housekeepingController');
const uploadController = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/authMiddleware');

// 🔹 Housekeeping Tasks
router.post('/tasks', housekeepingController.createTask);
router.get('/tasks', authMiddleware(['admin', 'staff'], ['housekeeping']), housekeepingController.getAllTasks);
router.get('/tasks/:taskId', authMiddleware(['admin', 'staff'], ['housekeeping']), housekeepingController.getTaskById);
router.get('/staff/:staffId/tasks', authMiddleware(['admin', 'staff']), housekeepingController.getStaffTasks);

// 🔹 Task Status + Assignment
router.patch('/tasks/:taskId/status', authMiddleware(['admin', 'staff'], ['housekeeping']), housekeepingController.updateTaskStatus);
router.put('/tasks/:taskId/status', authMiddleware(['admin', 'staff'], ['housekeeping']), housekeepingController.updateTaskStatus);
router.put('/tasks/:taskId/assign', authMiddleware(['admin', 'staff'], ['housekeeping']), housekeepingController.assignTask);

// 🔹 Room Inspection
router.get('/checklist/:roomId', housekeepingController.getChecklistByRoom);
router.post('/roominspection', housekeepingController.createRoomInspection); // ✅ Create Inspection
router.get('/roominspections', housekeepingController.getAllRoomInspections); // ✅ Get All Inspections
router.get('/roominspection/:inspectionId', housekeepingController.getRoomInspectionById);
router.get('/room/:roomId/inspections', housekeepingController.getRoomInspectionsByRoom);
router.get('/booking/:bookingId/inspections', housekeepingController.getRoomInspectionsByBooking);
router.put('/roominspection/:inspectionId', housekeepingController.updateRoomInspection);

// 🔹 Issues
router.post('/tasks/:taskId/issues', authMiddleware(['admin', 'staff'], ['housekeeping']), housekeepingController.reportIssue);
router.put('/tasks/:taskId/issues/:issueId/resolve', authMiddleware(['admin', 'staff'], ['housekeeping']), housekeepingController.resolveIssue);

// 🔹 Delete + History
router.delete('/tasks/:taskId', authMiddleware(['admin']), housekeepingController.deleteTask);
router.get('/rooms/:roomId/history', authMiddleware(['admin', 'staff'], ['housekeeping', 'reception']), housekeepingController.getRoomHistory);

// 🔹 Staff + Upload
router.get('/available-staff', authMiddleware(['admin', 'staff'], ['reception', 'housekeeping']), housekeepingController.getAvailableStaff);
router.post('/tasks/:taskId/images/before', authMiddleware(['admin', 'staff']), uploadController.uploadBase64Images);
router.post('/tasks/:taskId/images/after', authMiddleware(['admin', 'staff']), uploadController.uploadBase64Images);

module.exports = router;
