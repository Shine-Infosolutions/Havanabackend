const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/staff-profile', authMiddleware(['admin', 'staff', 'restaurant']), authController.getStaffProfile);
router.get('/all-users', authMiddleware(['admin']), authController.getAllUsers);
router.put('/users/:id', authMiddleware(['admin']), authController.updateUser);
router.delete('/users/:id', authMiddleware(['admin']), authController.deleteUser);
router.delete('/delete/:id', authMiddleware(['admin']), authController.deleteUser);
router.put('/update/:id', authMiddleware(['admin']), authController.updateUser);

module.exports = router;
