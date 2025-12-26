const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authService = require('../services/authService'); // ← DÒNG MỚI THÊM VÀO
const { requireGuest, requireAuth } = require('../middleware/authMiddleware');

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

// NEW ROUTES - OTP Registration Flow
// BƯỚC 1: Gửi OTP qua email
router.post('/api/register/initiate', authController.initiateRegistration);

// BƯỚC 2: Xác thực OTP và tạo tài khoản
router.post('/api/register/verify-otp', authController.verifyOTP);

// Gửi lại OTP
router.post('/api/register/resend-otp', authController.resendOTP);

// Trang nhập OTP
router.get('/verify-otp', (req, res) => {
  const email = req.session.pendingRegistration?.email || req.query.email || '';
  res.render('verify-otp', { email });
});

// FORGOT PASSWORD FLOW
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

// CAPTCHA - Tạo captcha SVG
router.get('/api/captcha', authController.generateCaptcha);

// GOOGLE OAUTH - Đăng nhập Google
router.post('/api/auth/google', authController.googleLogin);

// API đăng xuất
router.post('/api/logout', authController.logout);

// API kiểm tra trạng thái đăng nhập
router.get('/api/check-auth', authController.checkAuth);

// Lấy trạng thái 2FA hiện tại
router.get('/api/auth/2fa/status', requireAuth, async (req, res) => {
  try {
    const result = await authService.get2FAStatus(req.session.userId);
    res.json(result);
  } catch (err) {
    console.error('Error getting 2FA status:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Setup 2FA - Lấy QR code
router.get('/api/auth/2fa/setup', requireAuth, async (req, res) => {
  try {
    const result = await authService.setup2FA(req.session.userId);
    res.json(result);
  } catch (err) {
    console.error('Error setting up 2FA:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Bật 2FA
router.post('/api/auth/2fa/enable', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Thiếu mã xác thực' });
    }
    const result = await authService.enable2FA(req.session.userId, token);
    res.json(result);
  } catch (err) {
    console.error('Error enabling 2FA:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Tắt 2FA
router.post('/api/auth/2fa/disable', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Thiếu mã xác thực' });
    }
    const result = await authService.disable2FA(req.session.userId, token);
    res.json(result);
  } catch (err) {
    console.error('Error disabling 2FA:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;