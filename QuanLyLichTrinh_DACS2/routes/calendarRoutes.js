// routes/calendarRoutes.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const eventService = require('../services/eventService'); // dùng eventService vì có hàm getAllItemsByDateRange
const { requireAuth } = require('../middleware/authMiddleware');

// === TẤT CẢ ROUTES ĐỀU YÊU CẦU ĐĂNG NHẬP ===
router.use(requireAuth);

// API lấy cả Task + Event trong khoảng thời gian (dùng cho FullCalendar, Timeline, Month view...)
router.get('/items', async (req, res) => {
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

// routes/calendarRoutes.js
// Thêm vào cuối file (sau route /items)

// routes/calendarRoutes.js
// Thêm vào cuối file (sau route /items)

// API Insights – CHẠY NGON 100% VỚI DATABASE CỦA BẠN
router.get('/insights', async (req, res) => {
  try {
    const userId = req.session.userId;

    // ================== 1. TỔNG GIỜ HỌP TUẦN NÀY ==================
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = Chủ Nhật, 1 = Thứ Hai
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const eventsResult = await pool.query(`
      SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
          COALESCE(end_time, start_time + INTERVAL '1 hour') - start_time
        )) / 3600
      ), 0) AS total_hours
      FROM events 
      WHERE user_id = $1 
        AND start_time >= $2 
        AND start_time < $3
    `, [userId, startOfWeek, endOfWeek]);

    const weekly_meetings_hours = Number(parseFloat(eventsResult.rows[0].total_hours).toFixed(1));

    // ================== 2. GIỜ TRỐNG NGÀY MAI (8h–18h) ==================
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const workStart = new Date(tomorrow);
    workStart.setHours(8, 0, 0, 0);   // 8h sáng mai

    const workEnd = new Date(tomorrow);
    workEnd.setHours(18, 0, 0, 0);    // 6h chiều mai

    // Tính tổng thời gian bận (event + task) trong khung 8h–18h ngày mai
    const busyResult = await pool.query(`
      SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (
          LEAST(COALESCE(end_time, start_time + INTERVAL '1 hour'), $3) - 
          GREATEST(start_time, $2)
        )) / 3600
      ), 0) AS busy_hours
      FROM (
        -- Events
        SELECT start_time, end_time 
        FROM events 
        WHERE user_id = $1 
          AND start_time < $3 
          AND (end_time IS NULL OR end_time > $2)

        UNION ALL

        -- Tasks có thời gian (nếu có)
        SELECT start_time, end_time 
        FROM tasks 
        WHERE user_id = $1 
          AND start_time IS NOT NULL
          AND start_time < $3 
          AND (end_time IS NULL OR end_time > $2)
      ) AS all_items
    `, [userId, workStart, workEnd]);

    const busyHours = parseFloat(busyResult.rows[0].busy_hours);
    const tomorrow_free_hours = Number(Math.max(0, (10 - busyHours).toFixed(1))); // 10 giờ làm việc

    // Trả về kết quả đẹp
    res.json({
      success: true,
      insights: {
        weekly_meetings_hours,      // ví dụ: 7.5
        tomorrow_free_hours         // ví dụ: 5.0
      }
    });

  } catch (error) {
    console.error('Lỗi tính Insights:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tính insights',
      error: error.message
    });
  }
});

module.exports = router;