const express = require('express');
const { fixRoomStatus } = require('../controllers/migrationController');

const router = express.Router();

// Fix room status synchronization issues
router.post('/fix-room-status', fixRoomStatus);

module.exports = router;