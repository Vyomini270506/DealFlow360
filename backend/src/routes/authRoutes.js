const express = require('express');
const router = express.Router();
const { loginUser, sendOtp, registerUser, verifyLoginOtp, resetPassword, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', loginUser);
router.post('/send-otp', sendOtp);
router.post('/register', registerUser);
router.post('/login-otp', verifyLoginOtp);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;

