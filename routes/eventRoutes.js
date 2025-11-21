const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { requireAuth } = require('../middleware/authMiddleware');

// Tất cả routes đều cần đăng nhập
router.use(requireAuth);

// API routes cho events
router.get('/api/events', eventController.getEvents);
router.get('/api/events/range', eventController.getEventsByDateRange);
router.get('/api/events/:id', eventController.getEventById);
router.post('/api/events', eventController.createEvent);
router.put('/api/events/:id', eventController.updateEvent);
router.delete('/api/events/:id', eventController.deleteEvent);

module.exports = router;
