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

// API đăng ký
router.post('/api/register', authController.register);

// API đăng xuất
router.post('/api/logout', authController.logout);

// API kiểm tra trạng thái đăng nhập
router.get('/api/check-auth', authController.checkAuth);

module.exports = router;
