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
        done: tasks.filter(t => t.kanban_column === 'done'),
        overdue: tasks.filter(t => t.kanban_column === 'overdue')
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
      // Đảm bảo destructure đúng key (snake_case)
      start_time, 
      end_time,
      priority = 'medium',
      status = 'todo',
      repeatType = 'none',
      categoryId,
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
    const taskStartTime = start_time ? new Date(start_time) : new Date();
    const taskEndTime = end_time ? new Date(end_time) : null;

    if (taskEndTime && taskStartTime && taskEndTime < taskStartTime) {
      throw new Error('Thời gian kết thúc không thể trước thời gian bắt đầu');
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      throw new Error('Priority không hợp lệ. Chỉ chấp nhận: low, medium, high');
    }

    // Validate status
    const validStatuses = ['todo', 'in_progress', 'done', 'overdue']; 
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
        taskEndTime, // <-- FIX: Sử dụng taskEndTime (không null nếu có giá trị từ form)
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
    try {
      await this.getTaskById(taskId, userId);
    } catch (error) {
      return null; // Trả về null nếu không tìm thấy task
    }

    const {
      title,
      description,
      // 🌟 FIX: Đảm bảo chỉ destructure tên trường CSDL (snake_case)
      start_time,
      end_time,
      priority,
      status,
      repeatType,
      progress,
      kanbanColumn,
      collaborators,
      isAllDay,
      grace_end_time
    } = updateData;

    // Validation
    if (title !== undefined && title.trim().length === 0) {
      throw new Error('Tiêu đề task không được để trống');
    }

    if (end_time && start_time && new Date(end_time) < new Date(start_time)) {
      throw new Error('Thời gian kết thúc không thể trước thời gian bắt đầu');
    }

    if (progress !== undefined && (progress < 0 || progress > 100)) {
      throw new Error('Progress phải từ 0 đến 100');
    }

    // Xây dựng truy vấn động an toàn
    const updates = [];
    const params = [];
    let paramIndex = 1; // Bắt đầu từ $1

    // 🌟 ĐỊNH NGHĨA HÀM TIỆN ÍCH CỤC BỘ (FIX ReferenceError: addUpdate is not defined)
    const addUpdate = (key, value) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    };

    // 🌟 FIX: CHỈ SỬ DỤNG addUpdate và các biến đã được destructure (snake_case)
    addUpdate('title', title !== undefined ? title.trim() : title);
    addUpdate('description', description !== undefined ? description?.trim() || null : description);
    addUpdate('start_time', start_time); 
    addUpdate('end_time', end_time);     
    addUpdate('is_all_day', isAllDay);
    addUpdate('priority', priority);
    addUpdate('status', status);
    addUpdate('kanban_column', kanbanColumn);
    addUpdate('repeat_type', repeatType);
    addUpdate('progress', progress);
    addUpdate('collaborators', collaborators);
    addUpdate('grace_end_time', grace_end_time); 

    // ⛔ ĐÃ XÓA TẤT CẢ CÁC KHỐI IF LẶP LẠI VÀ SỬ DỤNG TÊN BIẾN SAI

    if (updates.length === 0) {
      throw new Error('Không có dữ liệu để cập nhật');
    }

    // Thêm các tham số WHERE (taskId, userId) vào cuối
    params.push(taskId, userId);
    
    // Xây dựng câu lệnh cuối cùng
    const query = `
      UPDATE tasks 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $${paramIndex} AND user_id = $${paramIndex + 1}
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

    return result.rows[0];
  }

  /**
   * CẬP NHẬT STATUS (quick action)
   */
  async updateTaskStatus(taskId, userId, newStatus) {
    // 🌟 FIX 4: Thêm 'overdue' vào danh sách trạng thái hợp lệ trong JS
    const validStatuses = ['todo', 'in_progress', 'done', 'overdue']; 
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

  // taskService.js - Sửa trong hàm getTaskStatistics

  /**
   * LẤY THỐNG KÊ TASKS (FIX CÚ PHÁP SQL)
   */
async getTaskStatistics(userId) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'todo') as todo,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'done') as done,
        -- ✅ FIX ENUM: Đếm Trễ hạn bằng kanban_column (Varchar)
        COUNT(*) FILTER (WHERE kanban_column = 'overdue') as overdue, 
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
