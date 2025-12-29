// services/eventService.js

const pool = require('../config/db');
const { RRule } = require('rrule'); // npm install rrule

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
    const rawEvents = result.rows;

    // === EXPAND RECURRING EVENTS ===
    const expandedEvents = [];

    const rangeStart = startDate ? new Date(startDate) : new Date('1970-01-01');
    const rangeEnd = endDate ? new Date(endDate) : new Date('2100-12-31');

    for (const event of rawEvents) {
      if (event.recurrence && event.recurrence.length > 0) {
        try {
          const rule = RRule.fromString(event.recurrence[0]);
          const instances = rule.between(rangeStart, rangeEnd, true);

          instances.forEach(instanceStart => {
            const durationMs = new Date(event.end_time) - new Date(event.start_time);
            expandedEvents.push({
              ...event,
              start_time: instanceStart,
              end_time: new Date(instanceStart.getTime() + durationMs),
              is_recurring_instance: true,
              original_event_id: event.event_id
            });
          });
        } catch (err) {
          console.error('Lỗi parse RRULE:', event.recurrence[0], err);
          expandedEvents.push(event); // fallback: hiển thị master event
        }
      } else {
        expandedEvents.push(event);
      }
    }

    return expandedEvents;
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

    const rawEvents = result.rows;

    // === EXPAND RECURRING EVENTS CHO THÁNG ===
    const expandedEvents = [];

    for (const event of rawEvents) {
      if (event.recurrence && event.recurrence.length > 0) {
        try {
          const rule = RRule.fromString(event.recurrence[0]);
          const instances = rule.between(firstDay, lastDay, true);

          instances.forEach(instanceStart => {
            const durationMs = new Date(event.end_time) - new Date(event.start_time);
            expandedEvents.push({
              ...event,
              start_time: instanceStart,
              end_time: new Date(instanceStart.getTime() + durationMs),
              is_recurring_instance: true,
              original_event_id: event.event_id
            });
          });
        } catch (err) {
          console.error('Lỗi parse RRULE trong getEventsByMonth:', err);
          expandedEvents.push(event);
        }
      } else {
        expandedEvents.push(event);
      }
    }

    return expandedEvents;
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
    if (categoryName === 'Personal' || categoryName === 'Work') {
      return null;
    }
    
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
      categoryId,
      repeatType = 'none',
      meetingLink,
      tags = [],
    } = eventData;

    if (!title || title.trim().length === 0) {
      throw new Error('Tiêu đề event không được để trống');
    }

    if (!startTime || !endTime) {
      throw new Error('Vui lòng nhập thời gian bắt đầu và kết thúc');
    }

    if (new Date(endTime) <= new Date(startTime)) {
      throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    
    let finalCategoryId = categoryId;
    if (typeof finalCategoryId === 'string' && finalCategoryId !== 'Personal' && finalCategoryId !== 'Work') {
        finalCategoryId = await this.getCategoryIdByName(userId, finalCategoryId);
    }

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
            eventData.calendarType || 'Personal'
        ]
    );

    return result.rows[0];
  }

  /**
   * CẬP NHẬT EVENT
   */
  async updateEvent(eventId, userId, updateData) {
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

    if (title !== undefined && title.trim().length === 0) {
      throw new Error('Tiêu đề event không được để trống');
    }

    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    let finalCategoryId = categoryId;
    if (typeof finalCategoryId === 'string' && finalCategoryId !== 'Personal' && finalCategoryId !== 'Work') {
        finalCategoryId = await this.getCategoryIdByName(userId, finalCategoryId);
    }

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
      params.push(finalCategoryId || null);
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

    const rawEvents = result.rows;

    // === EXPAND RECURRING CHO UPCOMING ===
    const expandedEvents = [];
    const now = new Date();
    const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 năm tới

    for (const event of rawEvents) {
      if (event.recurrence && event.recurrence.length > 0) {
        try {
          const rule = RRule.fromString(event.recurrence[0]);
          const instances = rule.between(now, farFuture, true);

          instances.slice(0, limit).forEach(instanceStart => { // Giới hạn để không quá nhiều
            const durationMs = new Date(event.end_time) - new Date(event.start_time);
            expandedEvents.push({
              ...event,
              start_time: instanceStart,
              end_time: new Date(instanceStart.getTime() + durationMs),
              is_recurring_instance: true,
              original_event_id: event.event_id
            });
          });
        } catch (err) {
          console.error('Lỗi parse RRULE trong upcoming:', err);
          expandedEvents.push(event);
        }
      } else {
        expandedEvents.push(event);
      }
    }

    // Sắp xếp lại và giới hạn
    expandedEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    return expandedEvents.slice(0, limit);
  }

  /**
   * LẤY CẢ TASK VÀ EVENT TRONG KHOẢNG THỜI GIAN
   */
  async getAllItemsByDateRange(userId, startDate, endDate, group = 'personal') {
    let userConditions = `e.user_id = $1`;
    
    if (group === 'team' || group === 'work') {
        userConditions = `(e.user_id = $1 OR e.calendar_type = 'Work')`;
    } 

    const baseTimeCondition = `e.start_time >= $2 AND e.start_time <= $3`;
    const taskTimeCondition = `t.start_time >= $2 AND t.start_time <= $3`;

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
        e.calendar_type,
        c.category_name AS category,
        e.color,
        NULL AS status,
        NULL AS priority
      FROM events e
      LEFT JOIN categories c ON e.category_id = c.category_id
      WHERE (${userConditions}) AND ${baseTimeCondition})

      UNION 

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
        NULL AS priority
      FROM events e
      JOIN shared_events se ON e.event_id = se.event_id
      LEFT JOIN categories c ON e.category_id = c.category_id
      WHERE se.shared_with_user_id = $1 AND ${baseTimeCondition}
        AND e.user_id != $1
      )
      
      UNION ALL 

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
        t.priority::text AS priority
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