// routes/googleRoutes.js

const express = require('express');
const router = express.Router();
const googleController = require('../controllers/googleController'); 

// ✅ IMPORT ĐÚNG MIDDLEWARE
const { requireAuth } = require('../middleware/authMiddleware'); // Thêm dòng này

// ===================================================================
// 1. KÍCH HOẠT OAUTH FLOW
// ===================================================================
router.get('/auth', requireAuth, (req, res) => {
  const { OAuth2Client } = require('google-auth-library');

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BASE_URL || 'http://localhost:3000'}/api/google/callback` // Dùng env hoặc fallback
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: JSON.stringify({ userId: req.session.userId })
  });

  res.redirect(url);
});

// ===================================================================
// 2. CALLBACK
// ===================================================================
router.get('/callback', googleController.handleGoogleCallback);

// ===================================================================
// 3. WEBHOOK
// ===================================================================
router.post('/webhook', googleController.handleWebhookNotification);

// (Các route khác nếu có)
module.exports = router;