const express = require('express');
const router = express.Router();
const laundryItemController = require('../controllers/laundryItemController');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, authorize(['ADMIN', 'STAFF','FRONT DESK']), laundryItemController.createLaundryItem);
router.get('/', auth, authorize(['ADMIN', 'STAFF', 'FRONT DESK']), laundryItemController.getLaundryItems);

// Filter routes (must be before /:id route)
router.get('/category/:category', auth, authorize(['ADMIN', 'STAFF', 'FRONT DESK']), laundryItemController.getLaundryItemsByCategory);
router.get('/category-id/:categoryId', auth, authorize(['ADMIN', 'STAFF', 'FRONT DESK']), laundryItemController.getLaundryItemsByCategoryId);
router.get('/vendor/:vendorId', auth, authorize(['ADMIN', 'STAFF', 'FRONT DESK']), laundryItemController.getLaundryItemsByVendor);

router.get('/:id', auth, authorize(['ADMIN', 'STAFF', 'FRONT DESK']), laundryItemController.getLaundryItemById);
router.put('/:id', auth, authorize(['ADMIN', 'STAFF','FRONT DESK']), laundryItemController.updateLaundryItem);
router.delete('/:id', auth, authorize(['ADMIN']), laundryItemController.deleteLaundryItem);

module.exports = router;