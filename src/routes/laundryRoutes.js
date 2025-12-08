const express = require('express');
const router = express.Router();
const laundryController = require('../controllers/laundryController');
const { auth, authorize } = require('../middleware/auth');

router.post('/orders', auth, authorize(['ADMIN', 'GM', 'STAFF', 'FRONT DESK']), laundryController.createLaundryOrder);
router.get('/orders', auth, authorize(['ADMIN', 'GM', 'ACCOUNTS', 'STAFF', 'FRONT DESK']), laundryController.getAllLaundryOrders);
router.get('/orders/:id', auth, authorize(['ADMIN', 'GM', 'ACCOUNTS', 'STAFF', 'FRONT DESK']), laundryController.getLaundryOrderById);
router.put('/orders/:id', auth, authorize(['ADMIN', 'GM', 'STAFF', 'FRONT DESK']), laundryController.updateLaundryOrder);
router.put('/orders/:id/status', auth, authorize(['ADMIN', 'GM', 'STAFF', 'FRONT DESK']), laundryController.updateLaundryStatus);
router.delete('/orders/:id', auth, authorize('ADMIN'), laundryController.deleteLaundryOrder);
router.get('/room/:roomNumber', auth, authorize(['ADMIN', 'GM', 'ACCOUNTS', 'STAFF', 'FRONT DESK']), laundryController.getLaundryByRoom);
router.get('/status/:status', auth, authorize(['ADMIN', 'GM', 'ACCOUNTS', 'STAFF', 'FRONT DESK']), laundryController.getLaundryByStatus);

module.exports = router;
