// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const { requireAuth } = require('../middleware/authMiddleware');

// Tất cả route đều yêu cầu đăng nhập
router.use(requireAuth);

// 1. Thống kê trạng thái task
router.get('/api/reports/tasks/status', async (req, res) => {
  try {
    const data = await reportService.getTaskStatusReport(req.session.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// 2. Task tạo mới trong tuần
router.get('/api/reports/tasks/week', async (req, res) => {
  try {
    const data = await reportService.getTaskByWeekReport(req.session.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// 3. Phân loại sự kiện
router.get('/api/reports/events', async (req, res) => {
  try {
    const data = await reportService.getEventTypeReport(req.session.userId);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// 4. Tạo PDF báo cáo
router.post('/api/reports/create', async (req, res) => {
  try {
    const result = await reportService.createMonthlyReport(req.session.userId);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi tạo báo cáo' });
  }
});

// 5. Gửi email báo cáo
router.post('/api/reports/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Thiếu email' });

    const result = await reportService.emailMonthlyReport(req.session.userId, email);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi gửi email' });
  }
});

module.exports = router;