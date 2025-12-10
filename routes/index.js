const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const taskService = require('../services/taskService');

// Import admin routes
const adminRoutes = require('./adminRoutes');
router.use('/admin', adminRoutes);

// Import message routes
const messageRoutes = require('./messageRoutes');
router.use('/api/messages', messageRoutes);

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
  res.render('index', { active: "dashboard" });
});

// Route hiển thị trang tasks
router.get('/tasks', requireAuth, (req, res) => {
  res.render('tasks', { active: "tasks" });
});

// Route hiển thị trang calendar
router.get('/calendar', requireAuth, (req, res) => {
  res.render('calendar', { active: "calendar" });
});

// Route hiển thị trang kanban
router.get('/kanban', requireAuth, (req, res) => {
  res.render('kanban', { active: "kanban" });
});

// Route hiển thị trang timeline
router.get('/timeline', requireAuth, (req, res) => {
  res.render('timeline', { active: "timeline" });
});

// Route hiển thị trang messages
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const pool = require('../config/db');
    const result = await pool.query(
      'SELECT user_id, username, email, full_name, avatar_url FROM users WHERE user_id = $1',
      [req.session.userId]
    );
    
    if (result.rows.length === 0) {
      return res.redirect('/login');
    }
    
    const user = result.rows[0];
    
    res.render('messages', { 
      active: "messages",
      user: user
    });
  } catch (error) {
    console.error('Error loading messages page:', error);
    res.redirect('/');
  }
});

// Route cũ giữ lại để redirect
router.get('/groups', requireAuth, (req, res) => {
  res.redirect('/messages');
});

// Route hiển thị trang notifications
router.get('/notifications', requireAuth, (req, res) => {
  res.render('notifications', { active: "notifications" });
});

// Route hiển thị trang profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const pool = require('../config/db');
    const result = await pool.query(
      'SELECT user_id, username, email, full_name, date_of_birth, avatar_url, gender, phone_number, created_at, updated_at, login_provider, google_id, language, is_2fa_enabled, settings FROM users WHERE user_id = $1',
      [req.session.userId]
    );
    
    if (result.rows.length === 0) {
      return res.redirect('/login');
    }
    
    const user = result.rows[0];
    
    res.render('profile', { 
      active: "profile",
      user: user
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    res.status(500).send('Có lỗi xảy ra khi tải trang hồ sơ');
  }
});

// Settings route removed - now using popup (settings-popup.ejs)

// Route hiển thị trang reports
router.get('/reports', requireAuth, (req, res) => {
  res.render('reports', { active: "reports" });
});

// Route hiển thị trang export-import
router.get('/export-import', requireAuth, (req, res) => {
  res.render('export-import', { active: "export" });
});

module.exports = router;