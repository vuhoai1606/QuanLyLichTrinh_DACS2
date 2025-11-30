// routes/calendarRoutes.js

const express = require('express');
const router = express.Router();
const eventService = require('../services/eventService'); // dùng eventService vì có hàm getAllItemsByDateRange
const { requireAuth } = require('../middleware/authMiddleware');

// === TẤT CẢ ROUTES ĐỀU YÊU CẦU ĐĂNG NHẬP ===
router.use(requireAuth);

// API lấy cả Task + Event trong khoảng thời gian (dùng cho FullCalendar, Timeline, Month view...)
router.get('/api/calendar/items', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { start, end } = req.query; // FullCalendar gửi định dạng ISO: "2025-04-01T00:00:00Z"

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số start hoặc end'
      });
    }

    const items = await eventService.getAllItemsByDateRange(userId, start, end);

    res.json({
      success: true,
      data: items
    });

  } catch (error) {
    console.error('Error fetching calendar items:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dữ liệu lịch',
      error: error.message
    });
  }
});

module.exports = router;