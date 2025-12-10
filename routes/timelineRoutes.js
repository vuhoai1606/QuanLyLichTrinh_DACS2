// routes/timelineRoutes.js
const express = require('express');
const router = express.Router();
const timelineController = require('../controllers/timelineController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

// API chính cho timeline
router.get('/api/timeline', timelineController.getTimelineData);
router.post('/api/timeline/sprints', timelineController.createSprint);

// (Tương lai mở rộng)
// router.put('/api/timeline/sprints/:id', timelineController.updateSprint);
// router.delete('/api/timeline/sprints/:id', timelineController.deleteSprint);

module.exports = router;