// routes/messageRoutes.js
// Routes cho messaging system

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/authMiddleware');

// Tất cả routes yêu cầu authentication
router.use(requireAuth);

// ===== SEARCH =====
// GET /api/messages/search?q=query
router.get('/search', messageController.searchUsers);

// ===== UNREAD COUNT =====
// GET /api/messages/unread/count
router.get('/unread/count', messageController.getUnreadCount);

// ===== CONVERSATIONS =====
// GET /api/messages/conversations
router.get('/conversations', messageController.getConversations);

// ===== MESSAGES =====
// GET /api/messages/:otherUserId
router.get('/:otherUserId', messageController.getMessages);

// POST /api/messages/:receiverId
router.post('/:receiverId', messageController.sendMessage);

// PUT /api/messages/read/:otherUserId
router.put('/read/:otherUserId', messageController.markAsRead);

// DELETE /api/messages/:messageId
router.delete('/:messageId', messageController.deleteMessage);

// ===== UPLOAD =====
// POST /api/messages/upload/:receiverId
router.post('/upload/:receiverId', messageController.uploadFile);

module.exports = router;
