const pool = require('../config/db');

/**
 * EVENT SERVICE
 * =============
 * Service xử lý nghiệp vụ liên quan đến Events (Calendar):
 * - CRUD operations
 * - Search theo thời gian, location
 * - Validation
 * - Business logic
 */

class EventService {
  /**
   * LẤY DANH SÁCH EVENTS CỦA USER
   * Filter theo khoảng thời gian (cho calendar view)
   */
  async getEventsByUser(userId, filters = {}) {
    const { startDate, endDate, search, categoryId } = filters;

    let query = `
      SELECT 
        e.*,
        c.category_name,
        c.color as category_color
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.category_id
      WHERE e.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    // Filter theo khoảng thời gian
    if (startDate) {
      query += ` AND e.start_time >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND e.end_time <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Filter theo category
    if (categoryId) {
      query += ` AND e.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }

    // Search theo title hoặc location
    if (search) {
      query += ` AND (e.title ILIKE $${paramIndex} OR e.location ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY e.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * LẤY EVENTS THEO THÁNG (cho calendar view)
   */
  async getEventsByMonth(userId, year, month) {
    // Tính first day và last day của tháng
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59);

    const result = await pool.query(
      `SELECT 
        e.*,
        c.category_name,
        c.color as category_color
       FROM events e
       LEFT JOIN categories c ON e.category_id = c.category_id
       WHERE e.user_id = $1
       AND e.start_time >= $2
       AND e.start_time <= $3
       ORDER BY e.start_time ASC`,
      [userId, firstDay, lastDay]
    );

    return result.rows;
  }

  /**
   * LẤY CHI TIẾT 1 EVENT
   */
  async getEventById(eventId, userId) {
    const result = await pool.query(
      `SELECT 
        e.*,
        c.category_name,
        c.color as category_color
       FROM events e
       LEFT JOIN categories c ON e.category_id = c.category_id
       WHERE e.event_id = $1 AND e.user_id = $2`,
      [eventId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Không tìm thấy event hoặc bạn không có quyền truy cập');
    }

    return result.rows[0];
  }

  /**
   * TẠO EVENT MỚI
   */
  async createEvent(userId, eventData) {
    const {
      title,
      description,
      startTime,
      endTime,
      location,
      categoryId,
      repeatType = 'none',
      notifyBefore,
      isAllDay = false,
      meetingLink,
      tags = [],
    } = eventData;

    // Validation
    if (!title || title.trim().length === 0) {
      throw new Error('Tiêu đề event không được để trống');
    }

    if (title.length > 255) {
      throw new Error('Tiêu đề event không được vượt quá 255 ký tự');
    }

    // Validate thời gian
    if (!startTime || !endTime) {
      throw new Error('Vui lòng nhập thời gian bắt đầu và kết thúc');
    }

    if (new Date(endTime) <= new Date(startTime)) {
      throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    // Kiểm tra thời lượng event (không quá 30 ngày)
    const duration = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60 * 24);
    if (duration > 30) {
      throw new Error('Event không thể kéo dài quá 30 ngày');
    }

    // Kiểm tra conflict với events khác (tùy chọn)
    const hasConflict = await this.checkTimeConflict(userId, startTime, endTime);
    if (hasConflict) {
      // Có thể warning thay vì throw error
      console.warn('⚠️ Event này trùng thời gian với event khác');
    }

    // Validate category nếu có
    if (categoryId) {
      const categoryCheck = await pool.query(
        'SELECT category_id FROM categories WHERE category_id = $1 AND user_id = $2',
        [categoryId, userId]
      );

      if (categoryCheck.rows.length === 0) {
        throw new Error('Category không tồn tại');
      }
    }

    // Insert event
    // services/eventService.js (Bên trong async createEvent)

// Sửa lệnh INSERT:
// Chỉ dùng $1 đến $11 (11 cột)
      const result = await pool.query(
        `INSERT INTO events (user_id, title, description, start_time, end_time, location, category_id, 
        repeat_type, is_all_day, meeting_link, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
        [
            userId,
            title.trim(),
            description?.trim() || null,
            startTime,
            endTime,
            location?.trim() || null,
            categoryId || null,
            repeatType,
            isAllDay,
            meetingLink || null,
            tags,
        ]
      );

    return result.rows[0];
  }

  /**
   * CẬP NHẬT EVENT
   */
  async updateEvent(eventId, userId, updateData) {
    // Kiểm tra event có tồn tại không
    await this.getEventById(eventId, userId);

    const {
      title,
      description,
      startTime,
      endTime,
      location,
      categoryId,
      repeatType,
      notifyBefore,
      isAllDay,
      meetingLink,
      tags,
    } = updateData;

    // Validation
    if (title !== undefined && title.trim().length === 0) {
      throw new Error('Tiêu đề event không được để trống');
    }

    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    // Build dynamic update query
    const updates = [];
    const params = [eventId, userId];
    let paramIndex = 3;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description?.trim() || null);
      paramIndex++;
    }

    if (startTime !== undefined) {
      updates.push(`start_time = $${paramIndex}`);
      params.push(startTime);
      paramIndex++;
    }

    if (endTime !== undefined) {
      updates.push(`end_time = $${paramIndex}`);
      params.push(endTime);
      paramIndex++;
    }

    if (location !== undefined) {
      updates.push(`location = $${paramIndex}`);
      params.push(location?.trim() || null);
      paramIndex++;
    }

    if (categoryId !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      params.push(categoryId);
      paramIndex++;
    }

    if (repeatType !== undefined) {
      updates.push(`repeat_type = $${paramIndex}`);
      params.push(repeatType);
      paramIndex++;
    }

    if (isAllDay !== undefined) {
      updates.push(`is_all_day = $${paramIndex}`);
      params.push(isAllDay);
      paramIndex++;
    }

    if (meetingLink !== undefined) {
      updates.push(`meeting_link = $${paramIndex}`);
      params.push(meetingLink);
      paramIndex++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(tags);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new Error('Không có dữ liệu để cập nhật');
    }

    const query = `
      UPDATE events 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * XÓA EVENT
   */
  async deleteEvent(eventId, userId) {
    const task = await this.getEventById(eventId, userId);

    const result = await pool.query(
      `DELETE FROM events 
       WHERE event_id = $1 AND user_id = $2
       RETURNING event_id, title, description`,
      [eventId, userId]
    );

    return { 
      success: true, 
      message: 'Đã xóa event thành công',
      deletedEvent: result.rows[0]
    };
  }

  /**
   * KIỂM TRA CONFLICT THỜI GIAN
   * Trả về true nếu có event trùng giờ
   */
  async checkTimeConflict(userId, startTime, endTime, excludeEventId = null) {
    let query = `
      SELECT COUNT(*) as conflict_count
      FROM events
      WHERE user_id = $1
      AND (
        (start_time <= $2 AND end_time >= $2) OR
        (start_time <= $3 AND end_time >= $3) OR
        (start_time >= $2 AND end_time <= $3)
      )
    `;

    const params = [userId, startTime, endTime];

    if (excludeEventId) {
      query += ` AND event_id != $4`;
      params.push(excludeEventId);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].conflict_count) > 0;
  }

  /**
   * LẤY EVENTS SẮP DIỄN RA (upcoming)
   */
  // 1. Dùng cho: Dashboard, Sidebar "Upcoming Events", Notifications
  async getUpcomingEvents(userId, limit = 5) {
    const result = await pool.query(
      `SELECT 
         e.*,
         c.category_name,
         c.color AS category_color
       FROM events e
       LEFT JOIN categories c ON e.category_id = c.category_id
       WHERE e.user_id = $1
         AND e.start_time > NOW()
       ORDER BY e.start_time ASC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  // 2. Dùng cho: Calendar (FullCalendar / custom calendar), Timeline, Kanban filter theo ngày
  async getEventsByDateRange(userId, startDate, endDate) {
    const result = await pool.query(
      `SELECT 
         e.*,
         c.category_name,
         c.color AS category_color
       FROM events e
       LEFT JOIN categories c ON e.category_id = c.category_id
       WHERE e.user_id = $1
         AND e.start_time >= $2
         AND e.end_time <= $3
       ORDER BY e.start_time ASC`,
      [userId, startDate, endDate]
    );
    return result.rows;
  }

// THÊM HÀM NÀY Ở CUỐI: Bonus để lấy cả task + event cho timeline/calendar (không ảnh hưởng hàm cũ)
  // services/eventService.js – SỬA HÀM getAllItemsByDateRange
  async getAllItemsByDateRange(userId, startDate, endDate) {
    const query = `
      (SELECT 
        'event' AS type, 
        e.event_id AS id,
        e.title,
        e.description,
        e.start_time AS start,
        e.end_time AS end,
        e.location,
        e.is_all_day,
        c.category_name AS category,
        c.color,
        NULL AS status,
        NULL AS priority
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.category_id
      WHERE e.user_id = $1
        AND e.start_time >= $2 AND e.end_time <= $3)

      UNION ALL

      (SELECT 
        'task' AS type,
        t.task_id AS id,
        t.title,
        t.description,
        t.start_time AS start,
        COALESCE(t.end_time, t.start_time + INTERVAL '1 hour') AS end,  -- ← SỬA DÒNG NÀY
        NULL AS location,
        FALSE AS is_all_day,
        'Task' AS category,
        CASE t.priority 
          WHEN 'high' THEN '#ef4444'
          WHEN 'medium' THEN '#f59e0b'
          ELSE '#10b981'
        END AS color,
        t.status,
        t.priority
      FROM tasks t
      WHERE t.user_id = $1
        AND t.start_time >= $2 AND t.start_time <= $3)

      ORDER BY start ASC
    `;

    const result = await pool.query(query, [userId, startDate, endDate]);
    return result.rows;
  }

  // THÊM HÀM NÀY ĐỂ TIMELINE LẤY EVENTS
  async getEventsForTimeline(userId) {
    const result = await pool.query(
      `SELECT event_id AS id, title, description, start_time AS start_date, end_time AS end_date, 'event' AS type
       FROM events
       WHERE user_id = $1
       ORDER BY start_time`,
      [userId]
    );
    return result.rows;
  }
}

// Export singleton
module.exports = new EventService();
