const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Protect all admin endpoints with auth & admin checks
router.use(authMiddleware);
router.use(adminMiddleware);

// Admin dashboard routes
router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/products/flagged', adminController.getFlaggedProducts);
router.get('/products', adminController.getAllProductsAdmin);
router.put('/products/:id/review', adminController.reviewProduct);
router.delete('/products/:id', adminController.deleteProductAdmin);
router.get('/disputes', adminController.getDisputes);
router.put('/orders/:id/override', adminController.overrideOrderStatus);
router.delete('/reviews/:id', adminController.deleteReview);

module.exports = router;
