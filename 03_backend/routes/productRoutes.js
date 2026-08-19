const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware } = require('../middleware/auth');
const { productValidator } = require('../middleware/validators');

// Public routes
router.get('/metadata', productController.getListingMetadata);
router.get('/meta/listing', productController.getListingMetadata);
router.get('/spec-options', productController.getSpecFilterOptions);
router.get('/seller/:sellerId/reviews', productController.getSellerReviews || ((req, res) => res.json([])));
router.get('/', productController.getAllProducts);

// Protected routes
router.get('/my/listings', authMiddleware, productController.getMyProducts);
router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware, productController.deleteProduct);
router.get('/:id', productController.getProductById);

module.exports = router;
