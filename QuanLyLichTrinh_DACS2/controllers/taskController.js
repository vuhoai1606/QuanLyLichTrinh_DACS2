// controllers/taskController.js
const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService');
const pool = require('../config/db');
/**
 * TASK CONTROLLER - Đã tái cấu trúc sử dụng Services
 * ====================================================
 * Controller chỉ xử lý HTTP request/response
 * Business logic đã chuyển sang taskService
 */

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
      // 🌟 FIX LỖI DATA FLOW: Chỉ sử dụng start_time và end_time (snake_case)
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
// CẬP NHẬT TASK – ĐÃ SỬA HOÀN TOÀN ĐÚNG TÊN CỘT CỦA BẠN (end_time, start_time)
exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.session.userId;
    const data = req.body;

    // Kiểm tra task thuộc user
    const check = await pool.query(
      'SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task không tồn tại' });
    }

    // Nếu có thay đổi end_time → reset grace_end_time để tính lại ân hạn
    if (data.end_time !== undefined) {
      data.grace_end_time = null;
    }

    // Tạo query động
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
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

    // Gửi thông báo nếu có thay đổi quan trọng
    if (data.status || data.start_time !== undefined || data.end_time !== undefined) {
      await notificationService.createNotification({
        userId,
        title: 'Nhiệm vụ được cập nhật',
        message: `Nhiệm vụ "${updatedTask.title}" đã được chỉnh sửa`,
        type: 'task'
      });
    }

    res.json({ success: true, task: updatedTask });

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

    // DÙNG chính deletedTask (có title) để tạo notification → đẹp hơn!
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

    // 🌟 KHẮC PHỤC: Tăng cường kiểm tra hợp lệ
    const validColumns = ['todo', 'in_progress', 'done', 'overdue'];
    if (!column || typeof column !== 'string' || !validColumns.includes(column)) { 
      // 💡 Thêm column để dễ dàng debug
      console.error(`Lỗi 400: Cột Kanban nhận được không hợp lệ: ${column}`); 
      return res.status(400).json({
        success: false,
        message: `Tên cột Kanban không hợp lệ hoặc bị thiếu. Cột nhận được: ${column}. Cột hợp lệ: ${validColumns.join(', ')}`
      });
    }
    
    let newStatus; 
    
    // ... (Logic tính newStatus giữ nguyên)
    if (column === 'done') {
        newStatus = 'done';
    } else if (column === 'in_progress') {
        newStatus = 'in_progress';
    } else if (column === 'overdue') {
        newStatus = 'overdue'; // Vẫn phải là 'overdue' để Task List hiển thị
    } else {
        newStatus = 'todo';
    }
    
    // 🌟 CẬP NHẬT: Tạo updateData chỉ với các trường cần thiết
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

    const stats = await taskService.getTaskStatistics(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê',
      error: error.message
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

    // 🌟 LƯU Ý: Nếu cột grace_end_time không tồn tại trong CSDL, dòng này sẽ lỗi DB. 
    // Giả định bạn sẽ thêm cột này hoặc chấp nhận lỗi tại đây.
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
      // 🌟 LƯU Ý: Dòng này cũng sẽ lỗi nếu cột grace_end_time không có trong CSDL.
      await pool.query(
        'UPDATE tasks SET grace_end_time = $1 WHERE task_id = $2',
        [graceEnd, taskId]
      );
    }
    
    // Chuyển về Done (Loại bỏ is_overdue = FALSE)
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
      // Quá thời gian ân hạn, chuyển về Overdue (Loại bỏ is_overdue = TRUE)
      await pool.query(
        // 🌟 FIX: Cập nhật status thành 'overdue' khi chuyển cột Kanban sang 'overdue'
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
    // 🌟 Thêm kiểm tra lỗi DB cho grace_end_time
    if (err.code === '42703') { // Lỗi cột không tồn tại
        return res.status(500).json({ success: false, message: 'Lỗi CSDL: Cột grace_end_time không tồn tại.' });
    }
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};