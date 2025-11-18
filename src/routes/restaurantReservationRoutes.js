const express = require('express');
const restaurantReservationController = require('../controllers/reasturantReservationController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', authMiddleware(['admin', 'staff', 'restaurant']), restaurantReservationController.createReservation);
router.get('/all', restaurantReservationController.getAllReservations);
router.get('/:id', restaurantReservationController.getReservationById);
router.put('/:id', authMiddleware(['admin', 'staff', 'restaurant']), restaurantReservationController.updateReservation);
router.patch('/:id/status', authMiddleware(['admin', 'staff', 'restaurant']), restaurantReservationController.updateReservationStatus);
router.patch('/:id/payment', authMiddleware(['admin', 'staff', 'restaurant']), restaurantReservationController.updatePayment);
router.delete('/:id', authMiddleware(['admin']), restaurantReservationController.deleteReservation);

module.exports = router;
