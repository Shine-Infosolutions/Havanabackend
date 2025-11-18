const express = require('express');
const router = express.Router();
const unitMasterController = require('../controllers/unitMasterController');

// Create a new unit
router.post('/add', unitMasterController.createUnit);

// Get all units
router.get('/all', unitMasterController.getUnits);

// Get a unit by ID
router.get('/get/:id', unitMasterController.getUnitById);

// Update a unit
router.put('/update/:id', unitMasterController.updateUnit);

// Delete a unit
router.delete('/delete/:id', unitMasterController.deleteUnit);

module.exports = router;