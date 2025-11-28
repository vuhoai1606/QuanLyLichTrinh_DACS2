const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const taskService = require('../services/taskService');

// API endpoints
// Lấy thống kê tổng quan cho dashboard
router.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const stats = await taskService.getTaskStatistics(userId);
    
    res.json({
      success: true,
      stats: {
        total: parseInt(stats.total) || 0,
        done: parseInt(stats.done) || 0,
        pending: parseInt(stats.pending) || 0,
        in_progress: parseInt(stats.in_progress) || 0,
        overdue: 0 // TODO: Calculate overdue tasks
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê',
      error: error.message
    });
  }
});

// Lấy số lượng notifications chưa đọc
router.get('/api/notifications/count', requireAuth, async (req, res) => {
  try {
    // TODO: Implement notifications table
    res.json({
      success: true,
      count: 0
    });
  } catch (error) {
    console.error('Error getting notifications count:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy số thông báo',
      error: error.message
    });
  }
});

// Lấy notes gần đây (placeholder)
router.get('/api/notes/recent', requireAuth, async (req, res) => {
  try {
    // TODO: Implement notes table
    res.json({
      success: true,
      notes: []
    });
  } catch (error) {
    console.error('Error getting recent notes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy ghi chú',
      error: error.message
    });
  }
});

// Route hiển thị dashboard (trang chủ)
router.get('/', requireAuth, (req, res) => {
  res.render('index');
});

// Route hiển thị trang tasks
router.get('/tasks', requireAuth, (req, res) => {
  res.render('tasks');
});

// Route hiển thị trang calendar
router.get('/calendar', requireAuth, (req, res) => {
  res.render('calendar');
});

// Route hiển thị trang kanban
router.get('/kanban', requireAuth, (req, res) => {
  res.render('kanban');
});

// Route hiển thị trang timeline
router.get('/timeline', requireAuth, (req, res) => {
  res.render('timeline');
});

// Route hiển thị trang groups
router.get('/groups', requireAuth, (req, res) => {
  res.render('groups');
});

// Route hiển thị trang notifications
router.get('/notifications', requireAuth, (req, res) => {
  res.render('notifications');
});

// Route hiển thị trang profile
router.get('/profile', requireAuth, (req, res) => {
  res.render('profile');
});

// Route hiển thị trang settings
router.get('/settings', requireAuth, (req, res) => {
  res.render('settings');
});

// Route hiển thị trang reports
router.get('/reports', requireAuth, (req, res) => {
  res.render('reports');
});

// Route hiển thị trang export-import
router.get('/export-import', requireAuth, (req, res) => {
  res.render('export-import');
});

module.exports = router;
