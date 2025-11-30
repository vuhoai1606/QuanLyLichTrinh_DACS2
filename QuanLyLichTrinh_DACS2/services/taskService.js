const pool = require('../config/db');

/**
 * TASK SERVICE
 * ============
 * Service xử lý nghiệp vụ liên quan đến Tasks:
 * - CRUD operations
 * - Search và filter
 * - Validation
 * - Business logic phức tạp
 */

class TaskService {
  /**
   * LẤY DANH SÁCH TASKS CỦA USER
   * Có thể filter theo status, priority, search keyword
   */
  async getTasksByUser(userId, filters = {}) {
    const { status, priority, search, sortBy = 'created_at', sortOrder = 'DESC', groupByKanban = false } = filters;

    let query = `
      SELECT 
        t.*
      FROM tasks t
      WHERE t.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    // Filter theo status
    if (status) {
      query += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter theo priority
    if (priority) {
      query += ` AND t.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    // Search theo title hoặc description
    if (search) {
      query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Sorting
    const allowedSortFields = ['created_at', 'start_time', 'priority', 'title'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    query += ` ORDER BY t.${sortField} ${sortOrder}`;

    const result = await pool.query(query, params);
    const tasks = result.rows;

  // QUAN TRỌNG: ĐOẠN NÀY PHẢI ĐẶT TRƯỚC return
    if (groupByKanban) {
      return {
        todo: tasks.filter(t => t.kanban_column === 'todo'),
        in_progress: tasks.filter(t => t.kanban_column === 'in_progress'),
        done: tasks.filter(t => t.kanban_column === 'done')
      };
    }

    return tasks;
  }

  /**
   * LẤY CHI TIẾT 1 TASK
   */
  async getTaskById(taskId, userId) {
    const result = await pool.query(
      `SELECT 
        t.*
       FROM tasks t
       WHERE t.task_id = $1 AND t.user_id = $2`,
      [taskId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Không tìm thấy task hoặc bạn không có quyền truy cập');
    }

    return result.rows[0];
  }

  /**
   * TẠO TASK MỚI
   * Validation + Business logic
   */
  async createTask(userId, taskData) {
    const {
      title,
      description,
      startTime,
      endTime,
      priority = 'medium',
      status = 'pending',
      categoryId,
      repeatType = 'none',
      tags = [],
      collaborators = [],
    } = taskData;

    // Validation
    if (!title || title.trim().length === 0) {
      throw new Error('Tiêu đề task không được để trống');
    }

    if (title.length > 255) {
      throw new Error('Tiêu đề task không được vượt quá 255 ký tự');
    }

    // Validate thời gian
    // Nếu không có startTime, dùng thời gian hiện tại
    const taskStartTime = startTime ? new Date(startTime) : new Date();
    const taskEndTime = endTime ? new Date(endTime) : null;

    if (taskEndTime && taskStartTime && taskEndTime < taskStartTime) {
      throw new Error('Thời gian kết thúc không thể trước thời gian bắt đầu');
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      throw new Error('Priority không hợp lệ. Chỉ chấp nhận: low, medium, high');
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      throw new Error('Status không hợp lệ');
    }

    // Insert task
    const result = await pool.query(
      `INSERT INTO tasks 
       (user_id, title, description, start_time, end_time, priority, status, repeat_type, kanban_column)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        title.trim(),
        description?.trim() || null,
        taskStartTime,
        taskEndTime,
        priority,
        status,
        repeatType,
        'todo', // Default kanban column
      ]
    );

    return result.rows[0];
  }

  /**
   * CẬP NHẬT TASK
   */
  async updateTask(taskId, userId, updateData) {
    // Kiểm tra task có tồn tại và thuộc về user không
    await this.getTaskById(taskId, userId);

    const {
      title,
      description,
      startTime,
      endTime,
      priority,
      status,
      categoryId,
      repeatType,
      tags,
      progress,
    } = updateData;

    // Validation tương tự như createTask
    if (title !== undefined && title.trim().length === 0) {
      throw new Error('Tiêu đề task không được để trống');
    }

    if (endTime && startTime && new Date(endTime) < new Date(startTime)) {
      throw new Error('Thời gian kết thúc không thể trước thời gian bắt đầu');
    }

    if (progress !== undefined && (progress < 0 || progress > 100)) {
      throw new Error('Progress phải từ 0 đến 100');
    }

    // Build dynamic update query
    const updates = [];
    const params = [taskId, userId];
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

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (repeatType !== undefined) {
      updates.push(`repeat_type = $${paramIndex}`);
      params.push(repeatType);
      paramIndex++;
    }

    if (progress !== undefined) {
      updates.push(`progress = $${paramIndex}`);
      params.push(progress);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new Error('Không có dữ liệu để cập nhật');
    }

    const query = `
      UPDATE tasks 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  /**
   * XÓA TASK
   */
  async deleteTask(taskId, userId) {
    // Kiểm tra task có tồn tại không
    const task = await this.getTaskById(taskId, userId);

    const result = await pool.query(
      `DELETE FROM tasks WHERE task_id = $1 AND user_id = $2
      RETURNING task_id, title, description, status, priority`,
      [taskId, userId]
    );

    return { 
      success: true, 
      message: 'Đã xóa task thành công', 
      deletedTask: result.rows[0] 
    };
  }

  /**
   * CẬP NHẬT STATUS (quick action)
   */
  async updateTaskStatus(taskId, userId, newStatus) {
    const validStatuses = ['pending', 'in_progress', 'done'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Status không hợp lệ');
    }

    await this.getTaskById(taskId, userId);

    const result = await pool.query(
      `UPDATE tasks 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE task_id = $2 AND user_id = $3
       RETURNING *`,
      [newStatus, taskId, userId]
    );

    return result.rows[0];
  }

  /**
   * LẤY THỐNG KÊ TASKS
   */
  async getTaskStatistics(userId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'done') as done,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE start_time::date = CURRENT_DATE) as today
       FROM tasks
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  /**
   * LẤY TASKS THEO KHOẢNG THỜI GIAN
   */
  async getTasksByDateRange(userId, startDate, endDate) {
    const result = await pool.query(
      `SELECT * FROM tasks
       WHERE user_id = $1
         AND start_time >= $2
         AND start_time < $3
       ORDER BY start_time ASC`,
      [userId, startDate, endDate]
    );

    return result.rows;
  }

  // THÊM HÀM MỚI Ở CUỐI FILE (không ảnh hưởng gì đến code cũ)
  async getTasksByDateRangeForCalendar(userId, startDate, endDate) {
    const result = await pool.query(
      `SELECT 
         'task' AS type,
         task_id AS id,
         title,
         description,
         start_time AS start,
         COALESCE(end_time, start_time + INTERVAL '1 hour') AS end,
         FALSE AS is_all_day,
         'Task' AS category,
         CASE priority 
           WHEN 'high' THEN '#ef4444'
           WHEN 'medium' THEN '#f59e0b'
           ELSE '#10b981'
         END AS color,
         status,
         priority
       FROM tasks
       WHERE user_id = $1
         AND start_time >= $2
         AND start_time <= $3
       ORDER BY start_time ASC`,
      [userId, startDate, endDate]
    );
    return result.rows;
  }

  // Thêm vào cuối file taskService.js (trước module.exports)

  async updateTaskKanbanColumn(taskId, userId, newColumn) {
    const result = await pool.query(
      `UPDATE tasks 
      SET kanban_column = $1, updated_at = NOW()
      WHERE task_id = $2 AND user_id = $3
      RETURNING *`,
      [newColumn, taskId, userId]
    );
    return result.rows[0] || null;
  }

    // THÊM HÀM NÀY ĐỂ TIMELINE LẤY TASKS CÓ NGÀY
  async getTasksForTimeline(userId) {
    const result = await pool.query(
      `SELECT 
         task_id AS id, 
         title, 
         description, 
         start_time AS start_date, 
         end_time AS end_date, 
         status, 
         priority
       FROM tasks
       WHERE user_id = $1 AND start_time IS NOT NULL
       ORDER BY start_time`,
      [userId]
    );
    return result.rows;
  }
}

// Export singleton
module.exports = new TaskService();
