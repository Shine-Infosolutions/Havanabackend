const express = require('express');
const itemController = require('../controllers/itemController');

const router = express.Router();

router.get('/all', itemController.getAllItems);
router.get('/available', itemController.getAvailableItems);
router.post('/add', itemController.createItem);
router.get('/get/:id', itemController.getItemById);
router.put('/update/:id', itemController.updateItem);
router.put('/:id', itemController.updateItem);
router.delete('/delete/:id', itemController.deleteItem);

module.exports = router;
