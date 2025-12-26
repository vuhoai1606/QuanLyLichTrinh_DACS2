const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { requireAuth } = require('../middleware/authMiddleware');

// Tất cả routes đều cần đăng nhập
router.use(requireAuth);

// API routes cho events
// Routes đặc biệt phải đặt TRƯỚC routes có parameter :id
router.get('/api/events', eventController.getEvents);
router.get('/api/events/upcoming', eventController.getUpcomingEvents);
router.get('/api/events/range', eventController.getEventsByDateRange);
router.post('/api/events', eventController.createEvent);

// Routes với :id parameter (đặt cuối)
router.get('/api/events/:id', eventController.getEventById);
router.put('/api/events/:id', eventController.updateEvent);
router.delete('/api/events/:id', eventController.deleteEvent);

module.exports = router;
