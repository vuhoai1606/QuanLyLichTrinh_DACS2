// services/notificationService.js
const pool = require('../config/db');

class NotificationService {
  // CHỐNG LỖI 100%: DÙNG OBJECT + KIỂM TRA userId và type
  async createNotification({ userId, type = 'system', title = 'Thông báo', message = '', redirectUrl = null, relatedId = null }) {
    // Bắt lỗi ngay từ đầu
    if (!userId) {
      console.error('LỖI: createNotification bị gọi mà không có userId!');
      return null;
    }

    const validTypes = ['task', 'event', 'message', 'system', 'sprint'];
    if (!validTypes.includes(type)) {
      console.warn(`Loại thông báo không hợp lệ: ${type} → dùng 'system' thay thế`);
      type = 'system';
    }

    if (!title) title = 'Thông báo';
    if (!message) message = '';

    const query = `
      INSERT INTO notifications (user_id, type, title, message, redirect_url, related_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [userId, type, title, message, redirectUrl, relatedId]);
      return result.rows[0];
    } catch (err) {
      console.error('Lỗi INSERT notifications:', err.message);
      return null;
    }
  }

  // Các hàm khác giữ nguyên (getAll, markAsRead, markAllRead)
  async getAll(userId, filter = 'all') {
    if (!userId) return { notifications: [], unreadCount: 0 };

    // ✅ JOIN với system_notifications để filter theo start_date
    let query = `
      SELECT n.* 
      FROM notifications n
      LEFT JOIN system_notifications sn ON n.related_id = sn.notification_id
      WHERE n.user_id = $1
      AND (
        n.related_id IS NULL -- Notification thường (không phải system)
        OR (
          sn.start_date <= NOW() -- Đã đến thời gian hiển thị
          AND sn.is_active = true -- Notification vẫn active
        )
      )
    `;
    const values = [userId];

    if (filter === 'unread') query += ' AND n.is_read = false';
    query += ' ORDER BY n.created_at DESC LIMIT 50';

    const res = await pool.query(query, values);
    
    // ✅ Count cũng phải filter tương tự
    const countRes = await pool.query(`
      SELECT COUNT(*) 
      FROM notifications n
      LEFT JOIN system_notifications sn ON n.related_id = sn.notification_id
      WHERE n.user_id = $1 
      AND n.is_read = false
      AND (
        n.related_id IS NULL
        OR (
          sn.start_date <= NOW()
          AND sn.is_active = true
        )
      )
    `, [userId]);

    return {
      notifications: res.rows,
      unreadCount: parseInt(countRes.rows[0]?.count || 0)
    };
  }

  async markAsRead(id) {
    if (!id) return;
    await pool.query('UPDATE notifications SET is_read = true WHERE notification_id = $1', [id]);
  }

  async markAllRead(userId) {
    if (!userId) return;
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
  }
}

module.exports = new NotificationService();