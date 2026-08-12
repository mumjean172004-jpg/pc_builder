const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { registerValidator, sellerRegistrationValidator } = require('../middleware/validators');

// Loose limits — protect against brute-force/spam without disrupting normal or demo usage
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'ขอรหัส OTP บ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' }
});

// Public Client Config (Google Client ID, etc.)
router.get('/config', (req, res) => {
  res.json({
    google_client_id: process.env.GOOGLE_CLIENT_ID || ''
  });
});

// Authentication & Social Login
router.post('/register', authLimiter, registerValidator, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/social-login', authController.socialLogin);
router.post('/logout', authController.logout);

// OTP Verification & Password Reset
router.post('/send-otp', otpLimiter, authController.sendOTP);
router.post('/verify-otp', otpLimiter, authController.verifyOTP);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Profile & Role Management
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/change-password', authMiddleware, authController.changePassword);
router.post('/switch-role', authMiddleware, authController.switchRole);

// Seller Verification & Profile
router.post('/register-seller', authMiddleware, sellerRegistrationValidator, authController.registerSeller);
router.put('/seller-profile', authMiddleware, authController.updateSellerProfile);
router.post('/verify-seller', authMiddleware, authController.verifySellerIdentity);

// Buyer Delivery Addresses
router.get('/addresses', authMiddleware, authController.getBuyerAddresses);
router.post('/addresses', authMiddleware, authController.addBuyerAddress);
router.put('/addresses/:id', authMiddleware, authController.updateBuyerAddress);
router.delete('/addresses/:id', authMiddleware, authController.deleteBuyerAddress);

// Wishlist
router.get('/wishlist', authMiddleware, authController.getWishlist);
router.post('/wishlist', authMiddleware, authController.addToWishlist);
router.delete('/wishlist/:productId', authMiddleware, authController.removeFromWishlist);

module.exports = router;
