const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireGuest } = require('../middleware/authMiddleware');

// Route hiển thị trang đăng nhập
router.get('/login', requireGuest, (req, res) => {
  res.render('login');
});

// Route hiển thị trang đăng ký
router.get('/register', requireGuest, (req, res) => {
  res.render('register');
});

// API đăng nhập
router.post('/api/login', authController.login);

// API đăng ký cũ (giữ lại để tương thích)
router.post('/api/register', authController.register);

// ============================================
// NEW ROUTES - OTP Registration Flow
// ============================================
// BƯỚC 1: Gửi OTP qua email
router.post('/api/register/initiate', authController.initiateRegistration);

// BƯỚC 2: Xác thực OTP và tạo tài khoản
router.post('/api/register/verify-otp', authController.verifyOTP);

// Gửi lại OTP
router.post('/api/register/resend-otp', authController.resendOTP);

// Trang nhập OTP
router.get('/verify-otp', (req, res) => {
  // Lấy email từ session hoặc query parameter
  const email = req.session.pendingRegistration?.email || req.query.email || '';
  res.render('verify-otp', { email });
});

// ============================================
// FORGOT PASSWORD FLOW
// ============================================
// Trang quên mật khẩu
router.get('/forgot-password', requireGuest, (req, res) => {
  res.render('forgot');
});

// BƯỚC 1: Verify username + email và gửi OTP
router.post('/api/auth/forgot-password/verify', authController.forgotPasswordVerify);

// BƯỚC 2: Verify OTP
router.post('/api/auth/forgot-password/verify-otp', authController.forgotPasswordVerifyOTP);

// BƯỚC 3: Reset password
router.post('/api/auth/forgot-password/reset', authController.forgotPasswordReset);

// ============================================
// CAPTCHA - Tạo captcha SVG
// ============================================
router.get('/api/captcha', authController.generateCaptcha);

// ============================================
// GOOGLE OAUTH - Đăng nhập Google
// ============================================
router.post('/api/auth/google', authController.googleLogin);

// API đăng xuất
router.post('/api/logout', authController.logout);

// API kiểm tra trạng thái đăng nhập
router.get('/api/check-auth', authController.checkAuth);

module.exports = router;