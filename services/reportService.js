// services/reportService.js - PHIÊN BẢN HOÀN CHỈNH

const pool = require('../config/db');
const EmailService = require('./emailService');

class ReportService {

  static async getTaskStatusReport(userId) {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count 
       FROM tasks 
       WHERE user_id = $1 
       GROUP BY status
       ORDER BY count DESC`,
      [userId]
    );
    return rows;
  }

  static async getEventTypeReport(userId, filter = {}) {
    let query = `
      SELECT COALESCE(c.category_name, 'Không phân loại') AS event_type, COUNT(*)::int AS count
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.category_id AND c.user_id = e.user_id
      WHERE e.user_id = $1`;
    const params = [userId];

    if (filter.month && filter.year) {
      query += ` AND EXTRACT(MONTH FROM e.created_at) = $2 AND EXTRACT(YEAR FROM e.created_at) = $3`;
      params.push(filter.month, filter.year);
    }

    query += ` GROUP BY c.category_name ORDER BY count DESC`;

    const { rows } = await pool.query(query, params);
    return rows.length > 0 ? rows : [];
  }

  static async getTasksByPeriod(userId, period = 'week') {
    let query = '';

    if (period === 'day') {
      query = `
        SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count
        FROM tasks 
        WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
        GROUP BY hour 
        ORDER BY hour ASC`;
    } else if (period === 'week') {
      query = `
        SELECT DATE(created_at) AS day, COUNT(*)::int AS count
        FROM tasks 
        WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(created_at) 
        ORDER BY day ASC`;
    } else if (period === 'month') {
      query = `
        SELECT DATE(created_at) AS day, COUNT(*)::int AS count
        FROM tasks 
        WHERE user_id = $1 
          AND created_at >= date_trunc('month', CURRENT_DATE)
          AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY DATE(created_at) 
        ORDER BY day ASC`;
    } else {
      throw new Error('Invalid period. Must be "day", "week" or "month".');
    }

    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  /** Hàm chung tạo HTML báo cáo - DÙNG CHO EMAIL, XEM VÀ PDF */
  static async generateReportHTML(userId) {
    const [taskStats, eventTypes] = await Promise.all([
      this.getTaskStatusReport(userId),
      this.getEventTypeReport(userId)
    ]);

    const now = new Date();
    const monthYear = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

    // Tạo bảng task
    let taskTable = taskStats.length > 0
      ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #6366f1; color: white;">
            <th style="padding: 15px; text-align: left;">Trạng thái</th>
            <th style="padding: 15px; text-align: center;">Số lượng</th>
          </tr>`
      : '<p style="color:#666; font-style:italic; text-align:center;">Chưa có công việc nào trong tháng này.</p>';

    taskStats.forEach(t => {
      const statusText = {
        'todo': 'Đang làm',
        'in_progress': 'Đang tiến hành',
        'done': 'Hoàn thành',
        'canceled': 'Đã hủy',
        'pending': 'Chờ xử lý'
      }[t.status] || t.status;

      const color = {
        'todo': '#f59e0b',
        'in_progress': '#06b6d4',
        'done': '#10b981',
        'canceled': '#ef4444',
        'pending': '#8b5cf6'
      }[t.status] || '#666';

      taskTable += `
        <tr style="background-color: #f8f9ff;">
          <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${statusText}</td>
          <td style="padding: 12px 15px; text-align: center; font-weight: bold; color: ${color};">${t.count}</td>
        </tr>`;
    });
    if (taskStats.length > 0) taskTable += '</table>';

    // Tạo bảng event
    let eventTable = eventTypes.length > 0
      ? `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #8b5cf6; color: white;">
            <th style="padding: 15px; text-align: left;">Loại sự kiện</th>
            <th style="padding: 15px; text-align: center;">Số lượng</th>
          </tr>`
      : '<p style="color:#666; font-style:italic; text-align:center;">Chưa có sự kiện nào trong tháng này.</p>';

    eventTypes.forEach(e => {
      eventTable += `
        <tr style="background-color: #faf5ff;">
          <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${e.event_type}</td>
          <td style="padding: 12px 15px; text-align: center; font-weight: bold; color: #8b5cf6;">${e.count}</td>
        </tr>`;
    });
    if (eventTypes.length > 0) eventTable += '</table>';

    const htmlReport = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo cáo tháng ${monthYear}</title>
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
    body::before { content: ''; position: fixed; inset: 0; background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.25), transparent 50%); animation: float 15s ease-in-out infinite; z-index: -1; }
    @keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -20px); } }
    .container { max-width: 680px; margin: 60px auto; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(20px); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5); animation: slideUp 0.6s ease-out; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 50px 40px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 38px; font-weight: 800; letter-spacing: -0.02em; text-shadow: 0 4px 20px rgba(0,0,0,0.2); }
    .content { padding: 50px 40px; color: #1e293b; font-size: 16px; line-height: 1.75; }
    h2 { color: #6366f1; font-size: 24px; font-weight: 700; margin: 48px 0 24px; padding-bottom: 12px; border-bottom: 3px solid #6366f1; }
    .footer { background: #f8f9fa; padding: 32px 40px; text-align: center; font-size: 14px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    @media (max-width: 768px) { .container { margin: 20px auto; border-radius: 16px; } .header { padding: 40px 24px; } .header h1 { font-size: 28px; } .content { padding: 32px 24px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BÁO CÁO THÁNG</h1>
      <p style="margin: 10px 0 0; font-size: 20px; opacity: 0.9;">${monthYear}</p>
    </div>
    <div class="content">
      <p style="font-size: 16px;">Xin chào bạn,</p>
      <p>Dưới đây là báo cáo tổng hợp công việc và lịch cá nhân của bạn trong tháng này:</p>
      <h2>Trạng thái công việc</h2>
      ${taskTable}
      <h2>Phân loại sự kiện</h2>
      ${eventTable}
      <div style="margin-top: 50px; padding: 20px; background: #f0f4f8; border-radius: 10px; text-align: center; color: #555; font-size: 14px;">
        Báo cáo được tạo tự động vào <strong>${now.toLocaleString('vi-VN')}</strong><br>
        <strong>Quản Lý Lịch Trình</strong> – Đồng hành cùng bạn mỗi ngày
      </div>
    </div>
    <div class="footer">
      © 2025 Quản Lý Lịch Trình. All rights reserved.<br>
      Báo cáo được tạo tự động từ hệ thống.
    </div>
  </div>
</body>
</html>`;

    return htmlReport;
  }

  static async emailMonthlyReport(userId, recipientEmail) {
    const html = await this.generateReportHTML(userId);
    const now = new Date();
    const monthYear = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

    try {
      await EmailService.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'QuanLyLichTrinh <noreply@quanlylichtrinh.com>',
        to: recipientEmail,
        subject: `Báo cáo tháng ${monthYear} - Quản Lý Lịch Trình`,
        html
      });
      return { success: true, message: 'Đã gửi báo cáo qua email thành công!' };
    } catch (error) {
      console.error('Lỗi gửi email:', error);
      throw new Error('Không thể gửi email báo cáo');
    }
  }

  static async createMonthlyReport(userId) {
    const html = await this.generateReportHTML(userId);
    return { success: true, html };
  }

  /** Tính hiệu suất tuần này */
  static async getWeeklyProductivity(userId) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const { rows: created } = await pool.query(
      `SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`,
      [userId, startOfWeek, endOfWeek]
    );

    const { rows: completed } = await pool.query(
      `SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1 AND status = 'done' AND updated_at >= $2 AND updated_at < $3`,
      [userId, startOfWeek, endOfWeek]
    );

    const createdCount = parseInt(created[0].count) || 0;
    const completedCount = parseInt(completed[0].count) || 0;

    const ratio = createdCount > 0 ? (completedCount / createdCount) * 100 : 100;
    const score = Math.min(100, Math.round(ratio));

    const startLastWeek = new Date(startOfWeek);
    startLastWeek.setDate(startLastWeek.getDate() - 7);
    const endLastWeek = new Date(startOfWeek);

    const { rows: lastWeek } = await pool.query(
      `SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1 AND status = 'done' AND updated_at >= $2 AND updated_at < $3`,
      [userId, startLastWeek, endLastWeek]
    );

    const lastWeekCount = parseInt(lastWeek[0].count) || 0;
    const trend = completedCount - lastWeekCount;

    const streak = await this.getCompletionStreak(userId);

    return { score, trend, created: createdCount, completed: completedCount, streak };
  }

  /** Tính chuỗi ngày hoàn thành */
  static async getCompletionStreak(userId) {
    const { rows } = await pool.query(
      `SELECT DISTINCT DATE(updated_at) AS date
       FROM tasks 
       WHERE user_id = $1 AND status = 'done'
       ORDER BY date DESC
       LIMIT 30`,
      [userId]
    );

    if (rows.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < rows.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);

      const taskDate = new Date(rows[i].date);
      taskDate.setHours(0, 0, 0, 0);

      if (taskDate.getTime() === expected.getTime()) {
        streak++;
      } else if (taskDate < expected) {
        break;
      }
    }

    return streak;
  }

  /** Lấy dữ liệu Hoàn thành vs Tạo mới trong 7 ngày gần nhất */
  static async getCompletedVsCreated(userId) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const { rows: created } = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM tasks 
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [userId, start]
    );

    const { rows: completed } = await pool.query(
      `SELECT DATE(updated_at) AS date, COUNT(*) AS count
       FROM tasks 
       WHERE user_id = $1 AND status = 'done' AND updated_at >= $2
       GROUP BY DATE(updated_at)
       ORDER BY date ASC`,
      [userId, start]
    );

    const dataMap = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
      dataMap[dateStr] = { date: dayName, created: 0, completed: 0 };
    }

    created.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (dataMap[dateStr]) dataMap[dateStr].created = parseInt(row.count);
    });

    completed.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      if (dataMap[dateStr]) dataMap[dateStr].completed = parseInt(row.count);
    });

    return Object.values(dataMap);
  }

  /** Top 5 danh mục task phổ biến nhất (hỗ trợ filter tháng/năm) */
  static async getTopTaskCategories(userId, filter = {}) {
    let query = `
      SELECT COALESCE(c.category_name, 'Không phân loại') AS category, COUNT(*) AS count
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.category_id AND c.user_id = t.user_id
      WHERE t.user_id = $1`;
    const params = [userId];

    if (filter.month && filter.year) {
      query += ` AND EXTRACT(MONTH FROM t.created_at) = $2 AND EXTRACT(YEAR FROM t.created_at) = $3`;
      params.push(filter.month, filter.year);
    } else {
      query += ` AND t.created_at >= date_trunc('month', CURRENT_DATE)`;
    }

    query += ` GROUP BY c.category_name ORDER BY count DESC LIMIT 5`;

    const { rows } = await pool.query(query, params);
    return rows;
  }

  /** Summary tổng quan tháng (hỗ trợ filter tháng/năm) */
  static async getMonthlySummary(userId, filter = {}) {
    let monthFilter = '';
    const params = [userId];

    if (filter.month && filter.year) {
      monthFilter = ` AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3`;
      params.push(filter.month, filter.year);
    } else {
      monthFilter = ` AND created_at >= date_trunc('month', CURRENT_DATE) AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`;
    }

    const { rows: totalTasks } = await pool.query(
      `SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1${monthFilter}`,
      params
    );

    const completedParams = [...params];
    const { rows: completedTasks } = await pool.query(
      `SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1 AND status = 'done'${monthFilter}`,
      completedParams
    );

    const eventParams = [...params];
    const { rows: totalEvents } = await pool.query(
      `SELECT COUNT(*) AS count FROM events WHERE user_id = $1${monthFilter}`,
      eventParams
    );

    return {
      totalTasks: parseInt(totalTasks[0].count) || 0,
      completedTasks: parseInt(completedTasks[0].count) || 0,
      totalEvents: parseInt(totalEvents[0].count) || 0
    };
  }
}

module.exports = ReportService;