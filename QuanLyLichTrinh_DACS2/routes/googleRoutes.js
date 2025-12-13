const express = require('express');
const router = express.Router();
// Import controller để xử lý logic (chúng ta sẽ dùng controller mock bên dưới)
const googleController = require('../controllers/googleController'); 
const { protectRoute } = require('../middleware/authMiddleware'); // Giả định có middleware bảo vệ route

// Giả định middleware bảo vệ route chỉ cần kiểm tra session
const protectMock = (req, res, next) => {
    // Dựa trên server.js của bạn, chúng ta có session.
    if (req.session && req.session.userId) return next();
    
    // Nếu chưa đăng nhập, trả về 401 để kích hoạt logic frontend
    return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized. Vui lòng đăng nhập.' 
    });
};


// ===================================================================
// 1. KÍCH HOẠT SYNC / AUTHENTICATION (Triggered by frontend button)
// Phương thức GET: /api/google/sync
// ===================================================================
router.get('/sync', protectMock, googleController.handleSyncRequest);

// ===================================================================
// 2. CALLBACK (Google gửi Tokens về đây)
// Phương thức GET: /api/google/callback
// ===================================================================
router.get('/callback', googleController.handleGoogleCallback);

// ===================================================================
// 3. WEBHOOK (Google gửi thông báo Real-time đến đây)
// Phương thức POST: /api/google/webhook
// ===================================================================
router.post('/webhook', googleController.handleWebhookNotification);


module.exports = router;