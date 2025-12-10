// controllers/timelineController.js
const pool = require('../config/db');
const notificationService = require('../services/notificationService'); // THÊM DÒNG NÀY

exports.getTimelineData = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Lấy Sprints
    const sprintsRes = await pool.query(
      `SELECT sprint_id AS id, title, start_date, end_date
       FROM sprints 
       WHERE user_id = $1 
       ORDER BY start_date`,
      [userId]
    );

    // Lấy Tasks (có ngày bắt đầu và kết thúc)
    const tasksRes = await pool.query(
      `SELECT 
         task_id AS id,
         title,
         description,
         start_time::date AS start_date,
         COALESCE(end_time::date, start_time::date + INTERVAL '7 days') AS end_date,
         status,
         priority
       FROM tasks 
       WHERE user_id = $1 
         AND start_time IS NOT NULL
       ORDER BY start_time`,
      [userId]
    );

    // Lấy Milestones (giả lập từ task có priority = 'high' hoặc tự tạo bảng sau)
    const milestonesRes = await pool.query(
      `SELECT 
         task_id AS id,
         title,
         start_time::date AS date
       FROM tasks 
       WHERE user_id = $1 
         AND priority = 'high'
         AND start_time IS NOT NULL
       LIMIT 10`,
      [userId]
    );

    res.json({
      success: true,
      sprints: sprintsRes.rows,
      tasks: tasksRes.rows.map(t => ({
        ...t,
        status: t.status || 'todo'
      })),
      milestones: milestonesRes.rows.map(m => ({
        id: m.id,
        title: m.title,
        date: m.date.toISOString().split('T')[0]
      }))
    });
  } catch (err) {
    console.error('Lỗi tải timeline:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.createSprint = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title, start_date, end_date } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu' });
    }

    const result = await pool.query(
      `INSERT INTO sprints (user_id, title, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING sprint_id AS id, title, start_date, end_date`,
      [userId, title, start_date, end_date]
    );

    const newSprint = result.rows[0];

    // THÊM: TẠO NOTI KHI THÊM SPRINT
    await notificationService.createNotification({
      userId,
      type: 'sprint',
      title: 'Sprint mới',
      message: `Bạn đã tạo sprint "${newSprint.title}" từ ${newSprint.start_date} đến ${newSprint.end_date}`,
      redirectUrl: '/timeline',
      relatedId: newSprint.id
    });

    res.json({ success: true, sprint: newSprint });
  } catch (err) {
    console.error('Lỗi tạo sprint:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// (giữ nguyên các hàm khác nếu có, như updateSprint, deleteSprint)