const express = require('express');
const router = express.Router();
const roomInspectionController = require('../controllers/roomInspectionController');

// Delete room inspection
router.delete('/:id', roomInspectionController.deleteRoomInspection);

module.exports = router;
