// services/reportService.js
const pool = require('../config/db');

// THÊM DÒNG NÀY VÀO ĐẦU FILE – DÙNG CHÍNH EmailService CỦA BẠN!
const EmailService = require('./emailService'); // Đúng đường dẫn luôn!

class ReportService {
  // === GIỮ NGUYÊN 3 HÀM CŨ CỦA BẠN ===
  static async getTaskStatusReport(userId) {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM tasks WHERE user_id = $1 GROUP BY status`,
      [userId]
    );
    return rows;
  }

  static async getTaskByWeekReport(userId) {
    const { rows } = await pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*)::int AS count
       FROM tasks 
       WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY DATE(created_at) ORDER BY day ASC`,
      [userId]
    );
    return rows;
  }

  static async getEventTypeReport(userId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(c.category_name, 'Không phân loại') AS event_type, COUNT(*)::int AS count
       FROM events e
       LEFT JOIN categories c ON e.category_id = c.category_id AND c.user_id = e.user_id
       WHERE e.user_id = $1
       GROUP BY c.category_name
       ORDER BY count DESC`,
      [userId]
    );
    return rows.length > 0 ? rows : [];
  }

  // HÀM GỬI EMAIL BÁO CÁO – ĐÃ DÙNG CHÍNH EmailService CỦA BẠN → GỬI THẬT 100%!
  static async emailMonthlyReport(userId, recipientEmail) {
    const [taskStats, eventTypes] = await Promise.all([
      this.getTaskStatusReport(userId),
      this.getEventTypeReport(userId)
    ]);

    const now = new Date();
    const monthYear = now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

    // Tạo bảng trạng thái công việc
    let taskTable = taskStats.length > 0 ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #6366f1; color: white;">
          <th style="padding: 15px; text-align: left;">Trạng thái</th>
          <th style="padding: 15px; text-align: center;">Số lượng</th>
        </tr>` : '<p style="color:#666; font-style:italic;">Chưa có công việc nào trong tháng này.</p>';

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

    // Tạo bảng sự kiện
    let eventTable = eventTypes.length > 0 ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #8b5cf6; color: white;">
          <th style="padding: 15px; text-align: left;">Loại sự kiện</th>
          <th style="padding: 15px; text-align: center;">Số lượng</th>
        </tr>` : '<p style="color:#666; font-style:italic;">Chưa có sự kiện nào trong tháng này.</p>';

    eventTypes.forEach(e => {
      eventTable += `
        <tr style="background-color: #faf5ff;">
          <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${e.event_type}</td>
          <td style="padding: 12px 15px; text-align: center; font-weight: bold; color: #8b5cf6;">${e.count}</td>
        </tr>`;
    });
    if (eventTypes.length > 0) eventTable += '</table>';

    // HTML EMAIL SIÊU ĐẸP – DÙNG CHUNG STYLE VỚI OTP CỦA BẠN
    const htmlEmail = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
body { 
  margin: 0; 
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
}

/* Animated background effect */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3), transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.25), transparent 50%);
  animation: float 15s ease-in-out infinite;
  z-index: -1;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}

.container { 
  max-width: 680px;
  margin: 60px auto;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5);
  animation: slideUp 0.6s ease-out;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.container:hover {
  transform: translateY(-8px);
  box-shadow: 
    0 30px 80px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.6);
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(40px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

.header { 
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  padding: 50px 40px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
  animation: shine 10s linear infinite;
}

@keyframes shine {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

.header h1 { 
  margin: 0;
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
  animation: fadeIn 0.8s ease-out 0.2s both;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.content { 
  padding: 50px 40px;
  color: #1e293b;
  font-size: 16px;
  line-height: 1.75;
  animation: fadeIn 0.8s ease-out 0.4s both;
}

.content p {
  margin-bottom: 20px;
  color: #475569;
}

.content strong {
  color: #1e293b;
  font-weight: 600;
}

h2 { 
  color: #6366f1;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(90deg, #6366f1, #8b5cf6, transparent) 1;
  padding-bottom: 12px;
  margin-top: 48px;
  margin-bottom: 24px;
  position: relative;
  transition: all 0.3s ease;
}

h2::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  transition: width 0.4s ease;
}

h2:hover::before {
  width: 120px;
}

h3 {
  color: #475569;
  font-size: 18px;
  font-weight: 600;
  margin-top: 32px;
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

ul, ol {
  margin: 20px 0;
  padding-left: 28px;
  color: #475569;
}

li {
  margin-bottom: 12px;
  padding-left: 8px;
}

a {
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

a:hover {
  color: #8b5cf6;
  border-bottom-color: #8b5cf6;
}

code {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Monaco', 'Courier New', monospace;
  color: #6366f1;
  border: 1px solid #e2e8f0;
}

blockquote {
  margin: 28px 0;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-left: 4px solid #6366f1;
  border-radius: 8px;
  color: #475569;
  font-style: italic;
}

.footer { 
  background: linear-gradient(135deg, #f8f9fa, #f1f3f5);
  padding: 32px 40px;
  text-align: center;
  font-size: 14px;
  color: #94a3b8;
  border-top: 1px solid #e2e8f0;
  animation: fadeIn 0.8s ease-out 0.6s both;
}

.footer p {
  margin: 8px 0;
  line-height: 1.6;
}

.footer a {
  color: #6366f1;
  font-weight: 600;
  transition: color 0.2s ease;
}

.footer a:hover {
  color: #8b5cf6;
}

/* Button styles (if needed) */
.button {
  display: inline-block;
  padding: 14px 32px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
  border: none;
  cursor: pointer;
}

.button:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.4);
  border-bottom: none;
}

.button:active {
  transform: translateY(-1px);
}

/* Divider */
hr {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
  margin: 40px 0;
}

/* Responsive */
@media (max-width: 768px) {
  body {
    padding: 10px;
  }
  
  .container {
    margin: 20px auto;
    border-radius: 16px;
  }
  
  .header {
    padding: 40px 24px;
  }
  
  .header h1 {
    font-size: 28px;
  }
  
  .content {
    padding: 32px 24px;
    font-size: 15px;
  }
  
  h2 {
    font-size: 20px;
    margin-top: 32px;
  }
  
  .footer {
    padding: 24px;
    font-size: 13px;
  }
}
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
          Đây là email tự động, vui lòng không trả lời.
        </div>
      </div>
    </body>
    </html>`;

    // GỬI EMAIL THẬT 100% QUA EmailService CỦA BẠN!
    try {
      await EmailService.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'QuanLyLichTrinh <noreply@quanlylichtrinh.com>',
        to: recipientEmail,
        subject: `Báo cáo tháng ${monthYear} - Quản Lý Lịch Trình`,
        html: htmlEmail
      });

      return { success: true, message: 'Đã gửi báo cáo qua email thành công!' };
    } catch (error) {
      console.error('Lỗi gửi email báo cáo:', error);
      throw new Error('Không thể gửi email báo cáo. Vui lòng thử lại sau.');
    }
  }
}

module.exports = ReportService;