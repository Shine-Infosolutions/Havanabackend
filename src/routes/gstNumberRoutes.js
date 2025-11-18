const express = require('express');
const router = express.Router();
const { 
  createGSTNumber, 
  getAllGSTNumbers, 
  getGSTNumberById, 
  getGSTDetails,
  updateGSTNumber, 
  deleteGSTNumber 
} = require('../controllers/gstNumberController');

// GST Number routes (Customer/Company details)
router.post('/create', createGSTNumber);
router.get('/all', getAllGSTNumbers);
router.get('/details/:gstNumber', getGSTDetails);
router.get('/:id', getGSTNumberById);
router.put('/update/:id', updateGSTNumber);
router.delete('/delete/:id', deleteGSTNumber);

module.exports = router;