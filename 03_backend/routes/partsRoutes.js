const express = require('express');
const router = express.Router();
const partsController = require('../controllers/partsController');

router.get('/', partsController.getParts);
router.get('/categories', partsController.getCategories);
router.get('/brands', partsController.getBrands);
router.get('/category/:slug', partsController.getPartsByCategory);
router.get('/:id', partsController.getPartById);

module.exports = router;
