// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware');
const upload = require('../config/multer');

// Middleware: Tất cả routes đều cần auth
router.use(requireAuth);

// POST /api/profile/update - Cập nhật thông tin profile (với avatar upload)
router.post('/update', upload.single('avatar'), profileController.updateProfile);

// POST /api/profile/change-password/request - Gửi OTP để đổi mật khẩu
router.post('/change-password/request', profileController.requestPasswordChange);

// POST /api/profile/change-password/verify - Xác minh OTP và đổi mật khẩu
router.post('/change-password/verify', profileController.verifyAndChangePassword);

// GET /api/profile/settings - Lấy settings
router.get('/settings', profileController.getSettings);

// PUT /api/profile/settings - Cập nhật settings
router.put('/settings', profileController.updateSettings);

// DELETE /api/profile/delete-account - Xóa tài khoản
router.delete('/delete-account', profileController.deleteAccount);

module.exports = router;