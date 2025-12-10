// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notiCtrl = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

// ĐÚNG 100% – CHỈ DÙNG POST
router.get('/api/notifications', notiCtrl.getNotifications);
router.post('/api/notifications/:id/read', notiCtrl.markRead);      // POST
router.post('/api/notifications/read-all', notiCtrl.markAllRead);   // POST

module.exports = router;