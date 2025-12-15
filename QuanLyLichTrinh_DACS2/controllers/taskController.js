// controllers/taskController.js
const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService');
const pool = require('../config/db');

// Lấy danh sách tasks của user với filters
exports.getTasks = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    // Lấy filters từ query params
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      search: req.query.search,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const tasks = await taskService.getTasksByUser(userId, filters);

    res.json({
      success: true,
      tasks: tasks
    });
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi lấy danh sách tasks',
      error: error.message 
    });
  }
};

// Lấy chi tiết 1 task
exports.getTaskById = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const task = await taskService.getTaskById(id, userId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    res.json({
      success: true,
      task: task
    });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

// Tạo task mới
exports.createTask = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const taskData = {
      title: req.body.title,
      description: req.body.description || null,
      start_time: req.body.start_time || new Date().toISOString(),
      end_time: req.body.end_time || null, 
      
      isAllDay: req.body.is_all_day || req.body.isAllDay || false,
      repeatType: req.body.repeat_type || req.body.repeatType || 'none',
      priority: req.body.priority || 'medium',
      status: req.body.status || 'todo',
      kanbanColumn: req.body.kanban_column || req.body.kanbanColumn || 'todo',
      categoryId: req.body.category_id || req.body.categoryId,
      tags: req.body.tags || [],
      progress: req.body.progress || 0
    };

    // GỌI SERVICE ĐÚNG CÁCH
    const newTask = await taskService.createTask(userId, taskData);

    // DÙNG newTask (đã có dữ liệu từ DB) ĐỂ TẠO NOTIFICATION
    await notificationService.createNotification({
      userId,
      type: 'task',
      title: 'Công việc mới',
      message: `Bạn đã tạo công việc "${newTask.title}"`,
      redirectUrl: '/tasks',
      relatedId: newTask.task_id
    });

    res.status(201).json({
      success: true,
      message: 'Tạo task thành công',
      data: newTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo task'
    });
  }
};

// Cập nhật task
exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.session.userId;
    const data = req.body;

    // Kiểm tra quyền sở hữu task - TỐT
    const check = await pool.query(
      'SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task không tồn tại' });
    }

    // Reset grace_end_time khi thay đổi end_time - TỐT
    if (data.end_time !== undefined) {
      data.grace_end_time = null;
    }

    // Query động an toàn, chỉ update field có giá trị - RẤT TỐT
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {  // ← Quan trọng: bỏ qua null/undefined
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (fields.length === 0) {
      return res.json({ success: true, message: 'Không có thay đổi' });
    }

    values.push(taskId);
    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE task_id = $${index} RETURNING *`;

    const result = await pool.query(query, values);
    const updatedTask = result.rows[0];

    // Thông báo notification - TỐT
    if (data.status || data.start_time !== undefined || data.end_time !== undefined) {
      await notificationService.createNotification({
        userId,
        title: 'Nhiệm vụ được cập nhật',
        message: `Nhiệm vụ "${updatedTask.title}" đã được chỉnh sửa`,
        type: 'task'
      });
    }

    res.json({ success: true, task: updatedTask });

    // ← Dòng log bạn thêm - ĐÚNG VỊ TRÍ HOÀN HẢO
    console.log('Payload update task:', data);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Xóa task
exports.deleteTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const deletedTask = await taskService.deleteTask(id, userId);

    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    await notificationService.createNotification({
      userId,
      type: 'task',
      title: 'Xóa công việc',
      message: `Bạn đã xóa công việc "${deletedTask.title}"`,
      redirectUrl: '/tasks',
      relatedId: id
    });

    res.json({
      success: true,
      message: 'Xóa task thành công'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa task',
      error: error.message
    });
  }
};

// Cập nhật trạng thái task (nhanh)
exports.updateTaskStatus = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không được để trống'
      });
    }

    const updatedTask = await taskService.updateTaskStatus(id, userId, status);

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    await notificationService.createNotification({
      userId,
      type: 'task',
      title: 'Cập nhật trạng thái công việc',
      message: `Công việc "${task.title}" đã thay đổi trạng thái thành "${status}"`,
      redirectUrl: '/tasks',
      relatedId: task.task_id
    });

    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật trạng thái',
      error: error.message
    });
  }
};

// Cập nhật cột Kanban (Dùng cho Auto Task Manager và Task List)
exports.updateTaskKanbanColumn = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { kanban_column, kanbanColumn } = req.body; 
    const column = kanban_column || kanbanColumn;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    // KHẮC PHỤC: Tăng cường kiểm tra hợp lệ
    const validColumns = ['todo', 'in_progress', 'done', 'overdue'];
    if (!column || typeof column !== 'string' || !validColumns.includes(column)) { 
      // Thêm column để dễ dàng debug
      console.error(`Lỗi 400: Cột Kanban nhận được không hợp lệ: ${column}`); 
      return res.status(400).json({
        success: false,
        message: `Tên cột Kanban không hợp lệ hoặc bị thiếu. Cột nhận được: ${column}. Cột hợp lệ: ${validColumns.join(', ')}`
      });
    }
    
    let newStatus; 
    
    if (column === 'done') {
        newStatus = 'done';
    } else if (column === 'in_progress') {
        newStatus = 'in_progress';
    } else if (column === 'overdue') {
        newStatus = 'overdue'; 
    } else {
        newStatus = 'todo';
    }
    
    // CẬP NHẬT: Tạo updateData chỉ với các trường cần thiết
    const updateData = { 
      kanbanColumn: column,
      status: newStatus, // Bắt buộc phải gửi để Task List đồng bộ
    };
    
    // Thử cập nhật task
    const updatedTask = await taskService.updateTask(id, userId, updateData);

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    await notificationService.createNotification({
      userId,
      type: 'task',
      title: 'Di chuyển công việc',
      message: `Công việc "${updatedTask.title}" đã được di chuyển đến cột "${column}"`,
      redirectUrl: '/kanban',
      relatedId: updatedTask.task_id
    });

    res.json({
      success: true,
      message: 'Cập nhật cột Kanban thành công',
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating kanban column:', error);
    res.status(400).json({
      success: false,
      message: 'Lỗi khi cập nhật cột Kanban',
      error: error.message
    });
  }
};

// Lấy thống kê tasks
exports.getTaskStatistics = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const rawStats = await taskService.getTaskStatistics(userId);

    // LOG ĐỂ DEBUG – BẬT LÊN KHI TEST
    console.log('Raw stats from service:', rawStats);

    const stats = {
      total: rawStats.total || 0,
      done: rawStats.done || 0,
      in_progress: rawStats.in_progress || 0,
      overdue: rawStats.overdue || 0
    };

    console.log('Final stats sent to frontend:', stats);

    res.json({
      success: true,
      stats // Đảm bảo đúng format
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    });
  }
};

// Lấy tasks hôm nay
exports.getTodayTasks = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    // Lấy tasks có start_time là hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await taskService.getTasksByDateRange(userId, today, tomorrow);

    res.json({
      success: true,
      tasks: tasks || []
    });
  } catch (error) {
    console.error('Error getting today tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tasks hôm nay',
      error: error.message
    });
  }
};

// Xác nhận hoàn thành trong thời gian ân hạn 5 phút
exports.confirmTaskComplete = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.session.userId;

    const { rows } = await pool.query(
      'SELECT end_time, grace_end_time, title FROM tasks WHERE task_id = $1 AND user_id = $2', 
      [taskId, userId]
    );

    if (rows.length === 0) return res.status(404).json({ success: false });

    const task = rows[0];
    const now = new Date();
    let graceEnd = task.grace_end_time ? new Date(task.grace_end_time) : null;

    if (!task.end_time) return res.status(400).json({ success: false, message: 'Task không có hạn chót' });

    if (!graceEnd) {
      graceEnd = new Date(task.end_time); 
      graceEnd.setMinutes(graceEnd.getMinutes() + 5);
      await pool.query(
        'UPDATE tasks SET grace_end_time = $1 WHERE task_id = $2',
        [graceEnd, taskId]
      );
    }
    
    // Chuyển về Done
    if (now <= graceEnd) {
      await pool.query(
        `UPDATE tasks 
         SET status = 'done', kanban_column = 'done', grace_end_time = NULL 
         WHERE task_id = $1`,
        [taskId]
      );

      await notificationService.createNotification({
        userId,
        title: 'Hoàn thành đúng hạn!',
        message: `Nhiệm vụ "${task.title}" đã được xác nhận hoàn thành`,
        type: 'task'
      });
      res.json({ success: true, action: 'confirm_ok' });
    } else {
      await pool.query(
        `UPDATE tasks SET kanban_column = 'overdue', status = 'overdue' WHERE task_id = $1`, 
        [taskId]
      );
      await notificationService.createNotification({
        userId,
        title: 'Trễ hạn!',
        message: `Nhiệm vụ "${task.title}" đã bị quá thời gian ân hạn.`,
        type: 'task'
      });
      res.json({ success: false, message: 'Quá thời gian ân hạn', action: 'overdue_auto' });
    }
  } catch (err) {
    console.error('Lỗi confirm complete:', err);
    // Thêm kiểm tra lỗi DB cho grace_end_time
    if (err.code === '42703') { 
        return res.status(500).json({ success: false, message: 'Lỗi CSDL: Cột grace_end_time không tồn tại.' });
    }
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });

    const { rows } = await pool.query(
      `SELECT category_id, category_name, color 
       FROM categories 
       WHERE user_id = $1 
       ORDER BY category_name`,
      [userId]
    );

    res.json({ success: true, categories: rows });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.reorderTasks = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { order } = req.body; // mảng task_id theo thứ tự mới

    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'Order phải là mảng' });
    }

    // Cập nhật sort_order (cần thêm cột này vào DB)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < order.length; i++) {
        await client.query(
          'UPDATE tasks SET sort_order = $1 WHERE task_id = $2 AND user_id = $3',
          [i, order[i], userId]
        );
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false });
  }
};