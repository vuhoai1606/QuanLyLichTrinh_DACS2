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
   * TÌM ID CỦA CATEGORY DỰA VÀO TÊN
   */
  async getCategoryIdByName(userId, categoryName) {
    // Nếu categoryName là 'Personal' hoặc 'Work' (tên mặc định), không cần tìm category_id
    if (categoryName === 'Personal' || categoryName === 'Work') {
      return null;
    }
    
    // Tìm category_id dựa trên tên category được gửi từ frontend
    const result = await pool.query(
        'SELECT category_id FROM categories WHERE user_id = $1 AND category_name ILIKE $2',
        [userId, categoryName]
    );

    return result.rows.length > 0 ? result.rows[0].category_id : null;
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
      categoryId, // Có thể là ID hoặc null
      repeatType = 'none',
      meetingLink,
      tags = [],
    } = eventData;

    // Validation
    if (!title || title.trim().length === 0) {
      throw new Error('Tiêu đề event không được để trống');
    }

    // Validate thời gian 
    if (!startTime || !endTime) {
      throw new Error('Vui lòng nhập thời gian bắt đầu và kết thúc');
    }

    if (new Date(endTime) <= new Date(startTime)) {
      throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    
    // Xử lý logic category_id: Nếu frontend gửi tên calendar_type, ta phải tìm ID
    let finalCategoryId = categoryId;
    if (typeof finalCategoryId === 'string' && finalCategoryId !== 'Personal' && finalCategoryId !== 'Work') {
        finalCategoryId = await this.getCategoryIdByName(userId, finalCategoryId);
    }
    // Nếu vẫn không có categoryId (ví dụ: là 'Personal'/'Work' hoặc không tìm thấy), set null

    // Insert event
    // is_all_day luôn là FALSE vì đã loại bỏ checkbox
    const result = await pool.query(
        `INSERT INTO events (user_id, title, description, start_time, end_time, location, category_id, 
        repeat_type, is_all_day, meeting_link, tags, calendar_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, $10, $11) 
        RETURNING *`,
        [
            userId,
            title.trim(),
            description?.trim() || null,
            startTime,
            endTime,
            location?.trim() || null,
            finalCategoryId || null,
            repeatType,
            meetingLink || null,
            tags,
            eventData.calendarType || 'Personal' // Lưu loại calendar/task vào cột calendar_type
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
      meetingLink,
      tags,
      calendarType
    } = updateData;

    // Validation
    if (title !== undefined && title.trim().length === 0) {
      throw new Error('Tiêu đề event không được để trống');
    }

    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    // Xử lý logic category_id cho update
    let finalCategoryId = categoryId;
    if (typeof finalCategoryId === 'string' && finalCategoryId !== 'Personal' && finalCategoryId !== 'Work') {
        finalCategoryId = await this.getCategoryIdByName(userId, finalCategoryId);
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
      params.push(finalCategoryId || null); // Sử dụng ID đã tìm được
      paramIndex++;
    }
    
    if (calendarType !== undefined) {
      updates.push(`calendar_type = $${paramIndex}`);
      params.push(calendarType); 
      paramIndex++;
    }

    if (repeatType !== undefined) {
      updates.push(`repeat_type = $${paramIndex}`);
      params.push(repeatType);
      paramIndex++;
    }
    
    // is_all_day luôn là FALSE
    updates.push(`is_all_day = FALSE`);

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
    const eventToDelete = await this.getEventById(eventId, userId);

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
        (start_time < $3 AND end_time > $2)
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

  /**
   * LẤY CẢ TASK VÀ EVENT TRONG KHOẢNG THỜI GIAN
   * Dùng cho Calendar/Timeline view
   */
  async getAllItemsByDateRange(userId, startDate, endDate, group = 'personal') {
    
    // Logic lọc theo nhóm (group)
    let userConditions = `e.user_id = $1`;
    
    if (group === 'team' || group === 'work') {
        // Mở rộng điều kiện: user_id = $1 HOẶC calendar_type = 'Work'
        userConditions = `(e.user_id = $1 OR e.calendar_type = 'Work')`;
    } 

    const baseTimeCondition = `e.start_time >= $2 AND e.start_time <= $3`;
    const taskTimeCondition = `t.start_time >= $2 AND t.start_time <= $3`;


    const query = `
      -- ======================= 1. EVENTS ĐƯỢC SỞ HỮU/NHÓM =======================
      (SELECT 
        'event' AS type, 
        e.event_id AS id,
        e.title,
        e.description,
        e.start_time AS start,
        e.end_time AS end,
        e.location,
        e.is_all_day,
        e.calendar_type,
        c.category_name AS category,
        e.color,
        NULL AS status,
        NULL AS priority -- Mặc định là TEXT
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.category_id
      WHERE (${userConditions}) AND ${baseTimeCondition})

      UNION 

      -- ======================= 2. EVENTS ĐƯỢC CHIA SẺ VỚI USER HIỆN TẠI =======================
      (SELECT
        'event' AS type,
        e.event_id AS id,
        e.title,
        e.description,
        e.start_time AS start,
        e.end_time AS end,
        e.location,
        e.is_all_day,
        e.calendar_type,
        c.category_name AS category,
        e.color,
        NULL AS status,
        NULL AS priority -- Mặc định là TEXT
      FROM events e
      JOIN shared_events se ON e.event_id = se.event_id
      LEFT JOIN categories c ON e.category_id = c.category_id
      WHERE se.shared_with_user_id = $1 AND ${baseTimeCondition}
        AND e.user_id != $1
      )
      
      UNION ALL 

      -- ========================= 3. TASKS CÁ NHÂN =========================
      (SELECT 
        'task' AS type,
        t.task_id AS id,
        t.title,
        t.description,
        t.start_time AS start,
        COALESCE(t.end_time, t.start_time + INTERVAL '1 hour') AS end, 
        NULL AS location,
        FALSE AS is_all_day,
        'Work' AS calendar_type, 
        'Task' AS category, 
        CASE t.priority 
          WHEN 'high' THEN '#ef4444'
          WHEN 'medium' THEN '#f59e0b'
          ELSE '#10b981'
        END AS color,
        t.status::text AS status, 
        t.priority::text AS priority -- ✨ ĐÃ SỬA: Chuyển đổi priority_enum sang TEXT ✨
      FROM tasks t
      WHERE t.user_id = $1 AND ${taskTimeCondition})
      
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