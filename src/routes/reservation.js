const express = require('express');
const controller = require('../controllers/reservationController');
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");


// Reservation APIs
router.post('/',  authMiddleware(["admin", "staff"], ["reception"]), controller.createReservation);
router.get('/',  authMiddleware(["admin", "staff"], ["reception"]), controller.getAllReservations);
router.get('/:id',  authMiddleware(["admin", "staff"], ["reception"]), controller.getReservationById);
router.get('/grc/:id',  authMiddleware(["admin", "staff"], ["reception"]), controller.getReservationByGRC);
router.put('/:id',  authMiddleware(["admin", "staff"], ["reception"]), controller.updateReservation);
router.patch('/:id/cancel',  authMiddleware(["admin", "staff"], ["reception"]), controller.cancelReservation);
router.patch('/:id/no-show',  authMiddleware(["admin", "staff"], ["reception"]), controller.markNoShow);
router.patch('/:id/link-booking',  authMiddleware(["admin", "staff"], ["reception"]), controller.linkToCheckIn);
router.delete('/:id',  authMiddleware(["admin", "staff"], ["reception"]), controller.deleteReservation);

module.exports = router;
