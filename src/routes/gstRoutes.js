const express = require('express');
const router = express.Router();
const { 
  createGST, 
  getAllGSTs, 
  getGSTById,
  updateGST, 
  deleteGST 
} = require('../controllers/gstController');

// GST Rate routes
router.post('/create', createGST);
router.get('/all', getAllGSTs);
router.get('/:id', getGSTById);
router.put('/update/:id', updateGST);
router.delete('/delete/:id', deleteGST);

module.exports = router;