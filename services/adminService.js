const pool = require('../config/db');

/**
 * ADMIN SERVICE
 * Business logic cho quản lý admin
 * Bao gồm: thống kê, quản lý users, audit logs, system notifications
 */

class AdminService {
  /**
   * 1. LẤY TỔNG QUAN DASHBOARD
   */
  async getDashboardOverview() {
    try {
      const result = await pool.query('SELECT * FROM admin_dashboard_overview');
      return result.rows[0];
    } catch (error) {
      console.error('❌ getDashboardOverview error:', error);
      throw new Error('Lỗi lấy thống kê dashboard');
    }
  }

  /**
   * 2. LẤY DANH SÁCH NGƯỜI DÙNG (có phân trang, filter, search)
   */
  async getUsers({ page = 1, limit = 20, search = '', role = '', status = '' }) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT 
          u.user_id, u.username, u.email, u.full_name, u.role, 
          u.is_active, u.created_at, u.last_login_at, u.login_provider,
          u.banned_at, u.banned_reason,
          uas.total_tasks, uas.total_events, uas.total_messages_sent
        FROM users u
        LEFT JOIN user_activity_stats uas ON u.user_id = uas.user_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      // Search filter
      if (search) {
        query += ` AND (u.username ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      // Role filter
      if (role) {
        query += ` AND u.role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }
      
      // Status filter
      if (status === 'active') {
        query += ` AND u.is_active = TRUE`;
      } else if (status === 'banned') {
        query += ` AND u.is_active = FALSE`;
      }
      
      // Count total (trước khi LIMIT)
      const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) FROM');
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);
      
      // Thêm ORDER BY và LIMIT
      query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      return {
        users: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ getUsers error:', error);
      throw new Error('Lỗi lấy danh sách người dùng');
    }
  }

  /**
   * 3. LẤY CHI TIẾT NGƯỜI DÙNG
   */
  async getUserDetail(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          u.*, 
          uas.total_tasks, uas.total_events, uas.total_messages_sent, uas.last_active_at
        FROM users u
        LEFT JOIN user_activity_stats uas ON u.user_id = uas.user_id
        WHERE u.user_id = $1
      `, [userId]);
      
      if (result.rows.length === 0) {
        throw new Error('Không tìm thấy người dùng');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ getUserDetail error:', error);
      throw error;
    }
  }

  /**
   * 4. CẤP QUYỀN ADMIN
   */
  async grantAdmin(adminId, targetUserId, ipAddress = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Kiểm tra user tồn tại
      const userCheck = await client.query('SELECT * FROM users WHERE user_id = $1', [targetUserId]);
      if (userCheck.rows.length === 0) {
        throw new Error('Không tìm thấy người dùng');
      }
      
      const user = userCheck.rows[0];
      
      // PROTECT ROOT ADMIN
      if (user.email === 'vuth.24it@vku.udn.vn') {
        throw new Error('Không thể thu hồi quyền admin gốc');
      }
      
      if (user.role !== 'admin') {
        throw new Error('Người dùng không phải là admin');
      }
      
      // Cập nhật role
      await client.query('UPDATE users SET role = $1 WHERE user_id = $2', ['admin', targetUserId]);
      
      // Tạo audit log
      await client.query(
        'SELECT create_admin_log($1, $2, $3, $4, $5, $6)',
        [
          adminId,
          'grant_admin',
          targetUserId,
          `Cấp quyền admin cho ${user.username}`,
          JSON.stringify({ old_role: 'user', new_role: 'admin' }),
          ipAddress
        ]
      );
      
      await client.query('COMMIT');
      return { success: true, message: 'Đã cấp quyền admin' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ grantAdmin error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 5. THU HỒI QUYỀN ADMIN
   */
  async revokeAdmin(adminId, targetUserId, ipAddress = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const userCheck = await client.query('SELECT * FROM users WHERE user_id = $1', [targetUserId]);
      if (userCheck.rows.length === 0) {
        throw new Error('Không tìm thấy người dùng');
      }
      
      const user = userCheck.rows[0];
      
      // PROTECT ROOT ADMIN
      if (user.email === 'vuth.24it@vku.udn.vn') {
        throw new Error('Không thể thu hồi quyền admin gốc');
      }
      
      if (user.role !== 'admin') {
        throw new Error('Người dùng không phải là admin');
      }
      
      // Cập nhật role
      await client.query('UPDATE users SET role = $1 WHERE user_id = $2', ['user', targetUserId]);
      
      // Tạo audit log
      await client.query(
        'SELECT create_admin_log($1, $2, $3, $4, $5, $6)',
        [
          adminId,
          'revoke_admin',
          targetUserId,
          `Thu hồi quyền admin từ ${user.username}`,
          JSON.stringify({ old_role: 'admin', new_role: 'user' }),
          ipAddress
        ]
      );
      
      await client.query('COMMIT');
      return { success: true, message: 'Đã thu hồi quyền admin' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ revokeAdmin error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 6. KHÓA TÀI KHOẢN (Ban User)
   */
  async banUser(adminId, targetUserId, reason, ipAddress = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const userCheck = await client.query('SELECT * FROM users WHERE user_id = $1', [targetUserId]);
      if (userCheck.rows.length === 0) {
        throw new Error('Không tìm thấy người dùng');
      }
      
      const user = userCheck.rows[0];
      
      // PROTECT ROOT ADMIN
      if (user.email === 'vuth.24it@vku.udn.vn') {
        throw new Error('Không thể khóa tài khoản admin gốc');
      }
      
      if (!user.is_active) {
        throw new Error('Tài khoản đã bị khóa');
      }
      
      // Khóa tài khoản
      await client.query(
        'UPDATE users SET is_active = FALSE, banned_at = NOW(), banned_reason = $1 WHERE user_id = $2',
        [reason, targetUserId]
      );
      
      // Tạo audit log
      await client.query(
        'SELECT create_admin_log($1, $2, $3, $4, $5, $6)',
        [
          adminId,
          'ban_user',
          targetUserId,
          `Khóa tài khoản ${user.username}: ${reason}`,
          JSON.stringify({ reason, banned_at: new Date().toISOString() }),
          ipAddress
        ]
      );
      
      await client.query('COMMIT');
      return { success: true, message: 'Đã khóa tài khoản' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ banUser error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 7. MỞ KHÓA TÀI KHOẢN
   */
  async unbanUser(adminId, targetUserId, ipAddress = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const userCheck = await client.query('SELECT * FROM users WHERE user_id = $1', [targetUserId]);
      if (userCheck.rows.length === 0) {
        throw new Error('Không tìm thấy người dùng');
      }
      
      const user = userCheck.rows[0];
      if (user.is_active) {
        throw new Error('Tài khoản chưa bị khóa');
      }
      
      // Mở khóa
      await client.query(
        'UPDATE users SET is_active = TRUE, banned_at = NULL, banned_reason = NULL WHERE user_id = $1',
        [targetUserId]
      );
      
      // Tạo audit log
      await client.query(
        'SELECT create_admin_log($1, $2, $3, $4, $5, $6)',
        [
          adminId,
          'unban_user',
          targetUserId,
          `Mở khóa tài khoản ${user.username}`,
          JSON.stringify({ unbanned_at: new Date().toISOString() }),
          ipAddress
        ]
      );
      
      await client.query('COMMIT');
      return { success: true, message: 'Đã mở khóa tài khoản' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ unbanUser error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 8. XÓA NGƯỜI DÙNG (SOFT DELETE - chuyển thành inactive thay vì xóa hẳn)
   */
  async deleteUser(adminId, targetUserId, reason, ipAddress = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const userCheck = await client.query('SELECT * FROM users WHERE user_id = $1', [targetUserId]);
      if (userCheck.rows.length === 0) {
        throw new Error('Không tìm thấy người dùng');
      }
      
      const user = userCheck.rows[0];
      
      // PROTECT ROOT ADMIN
      if (user.email === 'vuth.24it@vku.udn.vn') {
        throw new Error('Không thể xóa tài khoản admin gốc');
      }
      
      // Xóa HARD - CASCADE sẽ xóa tất cả dữ liệu liên quan
      await client.query('DELETE FROM users WHERE user_id = $1', [targetUserId]);
      
      // Tạo audit log
      await client.query(
        'SELECT create_admin_log($1, $2, $3, $4, $5, $6)',
        [
          adminId,
          'delete_user',
          targetUserId,
          `Xóa tài khoản ${user.username}: ${reason}`,
          JSON.stringify({ 
            username: user.username,
            email: user.email,
            reason,
            deleted_at: new Date().toISOString()
          }),
          ipAddress
        ]
      );
      
      await client.query('COMMIT');
      return { success: true, message: 'Đã xóa tài khoản' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ deleteUser error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 9. TẠO THÔNG BÁO HỆ THỐNG
   */
  async createSystemNotification(adminId, { title, content, type = 'info', startDate, endDate, targetUsers = 'all' }, ipAddress = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Tạo notification
      const result = await client.query(`
        INSERT INTO system_notifications 
        (created_by, title, content, notification_type, start_date, end_date, target_users)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [adminId, title, content, type, startDate || new Date(), endDate, targetUsers]);
      
      // Tạo audit log
      await client.query(
        'SELECT create_admin_log($1, $2, $3, $4, $5, $6)',
        [
          adminId,
          'create_notification',
          null,
          `Tạo thông báo hệ thống: ${title}`,
          JSON.stringify({ notification_id: result.rows[0].notification_id, type, target_users: targetUsers }),
          ipAddress
        ]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ createSystemNotification error:', error);
      throw new Error('Lỗi tạo thông báo hệ thống');
    } finally {
      client.release();
    }
  }

  /**
   * 10. LẤY DANH SÁCH THÔNG BÁO HỆ THỐNG
   */
  async getSystemNotifications({ page = 1, limit = 20, isActive = null }) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT sn.*, u.username AS creator_username
        FROM system_notifications sn
        JOIN users u ON sn.created_by = u.user_id
        WHERE 1=1
      `;
      
      const params = [];
      if (isActive !== null) {
        query += ` AND sn.is_active = $1`;
        params.push(isActive);
      }
      
      query += ` ORDER BY sn.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      // Count total
      const countQuery = `SELECT COUNT(*) FROM system_notifications WHERE is_active = $1`;
      const countResult = await pool.query(countQuery, [isActive]);
      
      return {
        notifications: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      };
    } catch (error) {
      console.error('❌ getSystemNotifications error:', error);
      throw new Error('Lỗi lấy danh sách thông báo');
    }
  }

  /**
   * 11. XÓA/VÔ HIỆU HÓA THÔNG BÁO HỆ THỐNG
   */
  async deleteSystemNotification(adminId, notificationId, ipAddress = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Vô hiệu hóa thay vì xóa
      await client.query('UPDATE system_notifications SET is_active = FALSE WHERE notification_id = $1', [notificationId]);
      
      // Audit log
      await client.query(
        'SELECT create_admin_log($1, $2, $3, $4, $5, $6)',
        [
          adminId,
          'delete_notification',
          null,
          `Xóa thông báo hệ thống #${notificationId}`,
          JSON.stringify({ notification_id: notificationId }),
          ipAddress
        ]
      );
      
      await client.query('COMMIT');
      return { success: true, message: 'Đã xóa thông báo' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ deleteSystemNotification error:', error);
      throw new Error('Lỗi xóa thông báo');
    } finally {
      client.release();
    }
  }

  /**
   * 12. LẤY AUDIT LOGS (lịch sử hành động admin)
   */
  async getAuditLogs({ page = 1, limit = 50, actionType = '', adminId = null }) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT 
          al.*,
          u_admin.username AS admin_username,
          u_target.username AS target_username
        FROM admin_logs al
        JOIN users u_admin ON al.admin_id = u_admin.user_id
        LEFT JOIN users u_target ON al.target_user_id = u_target.user_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      if (actionType) {
        query += ` AND al.action_type = $${paramIndex}`;
        params.push(actionType);
        paramIndex++;
      }
      
      if (adminId) {
        query += ` AND al.admin_id = $${paramIndex}`;
        params.push(adminId);
        paramIndex++;
      }
      
      query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      // Count
      const countQuery = `SELECT COUNT(*) FROM admin_logs WHERE 1=1${actionType ? ' AND action_type = $1' : ''}`;
      const countParams = actionType ? [actionType] : [];
      const countResult = await pool.query(countQuery, countParams);
      
      return {
        logs: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        }
      };
    } catch (error) {
      console.error('❌ getAuditLogs error:', error);
      throw new Error('Lỗi lấy audit logs');
    }
  }

  /**
   * 13. THỐNG KÊ HOẠT ĐỘNG THEO THỜI GIAN (cho charts)
   */
  async getActivityStats(days = 7) {
    try {
      const result = await pool.query(`
        SELECT 
          DATE(created_at) AS date,
          COUNT(*) AS new_users
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('❌ getActivityStats error:', error);
      throw new Error('Lỗi lấy thống kê hoạt động');
    }
  }
}

module.exports = new AdminService();
