const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { bookingValidator } = require('../middleware/validators');

// All booking & chat routes require authentication
router.use(authMiddleware);

// Bookings / Orders endpoints
router.post('/', bookingValidator, bookingController.createBooking);
router.put('/:id/status', bookingController.updateBookingStatus);
router.post('/:id/slip', upload.single('slip'), bookingController.uploadPaymentSlip);
router.put('/:id/ship', bookingController.shipOrderWithProof);
router.get('/:id/tracking', bookingController.getTrackingDetails);
router.post('/:id/dispute', bookingController.fileDispute);
router.get('/:id/evidence', bookingController.exportLegalEvidence);
router.post('/:id/review', bookingController.createReview);
router.put('/:id/review', bookingController.updateReview);
router.get('/:id/review', bookingController.getReviewForOrder);

// Chats / Negotiations endpoints
router.get('/chats/rooms', bookingController.getChatRooms);
router.get('/chats/rooms/:roomId', bookingController.getRoomMessages);
router.get('/chats/rooms/:roomId/messages', bookingController.getRoomMessages);
router.post('/chats/rooms/:roomId/messages', bookingController.postMessage);

module.exports = router;
