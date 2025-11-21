const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');

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
