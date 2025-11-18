const express = require('express');
const router = express.Router();
const { 
  createAndApplyNOC, 
  getAllNOCs, 
  getNOCById, 
  updateNOC, 
  deleteNOC, 
  markNOCAsUsed,
  updateStatus 
} = require('../controllers/nocController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Simple NOC routes
router.post('/create', createAndApplyNOC);
router.get('/all', getAllNOCs);
router.get('/:id', getNOCById);
router.put('/use/:id', markNOCAsUsed);
router.put('/status/:id', updateStatus);
router.put('/update/:id', updateNOC);
router.delete('/delete/:id', deleteNOC);

module.exports = router;