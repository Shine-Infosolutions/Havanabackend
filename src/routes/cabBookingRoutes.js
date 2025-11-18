const express = require('express');
const router = express.Router();

const cabBookingController = require('../controllers/cabBookingController');

// 🔹 Create a new cab booking
router.post('/bookings', cabBookingController.createCabBooking);

// 🔹 Get all cab bookings (optional filters: ?status= & purpose=)
router.get('/bookings', cabBookingController.getAllCabBookings);

// 🔹 Get a cab booking by ID
router.get('/bookings/:id', cabBookingController.getCabBookingById);

// 🔹 Update a cab booking by ID
router.put('/update/:id', cabBookingController.updateCabBooking);

// 🔹 Cancel a cab booking
router.patch('/:id/cancel', cabBookingController.cancelCabBooking);

// 🔹 Delete a cab booking permanently
router.delete('/delete/:id', cabBookingController.deleteCabBooking);

// 🔹 Get bookings by Driver ID
router.get('/driver/:driverId', cabBookingController.getCabBookingsByDriver);

module.exports = router;
