const taskService = require('../services/taskService');

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
      data: task
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
      description: req.body.description,
      startTime: req.body.start_time || req.body.startTime,
      endTime: req.body.end_time || req.body.endTime,
      isAllDay: req.body.is_all_day || req.body.isAllDay || false,
      repeatType: req.body.repeat_type || req.body.repeatType || 'none',
      priority: req.body.priority || 'medium',
      status: req.body.status || 'pending',
      kanbanColumn: req.body.kanban_column || req.body.kanbanColumn || 'todo',
      categoryId: req.body.category_id || req.body.categoryId,
      tags: req.body.tags || [],
      progress: req.body.progress || 0
    };

    const newTask = await taskService.createTask(userId, taskData);

    res.status(201).json({
      success: true,
      message: 'Tạo task thành công',
      data: newTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi tạo task',
      error: error.message
    });
  }
};

// Cập nhật task
exports.updateTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Vui lòng đăng nhập' 
      });
    }

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      startTime: req.body.start_time || req.body.startTime,
      endTime: req.body.end_time || req.body.endTime,
      isAllDay: req.body.is_all_day || req.body.isAllDay,
      repeatType: req.body.repeat_type || req.body.repeatType,
      priority: req.body.priority,
      status: req.body.status,
      kanbanColumn: req.body.kanban_column || req.body.kanbanColumn,
      categoryId: req.body.category_id || req.body.categoryId,
      tags: req.body.tags,
      progress: req.body.progress
    };

    // Loại bỏ các giá trị undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedTask = await taskService.updateTask(id, userId, updateData);

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật task thành công',
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Lỗi khi cập nhật task',
      error: error.message
    });
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

    const deleted = await taskService.deleteTask(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

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

// Cập nhật cột Kanban
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

    if (!column) {
      return res.status(400).json({
        success: false,
        message: 'Kanban column không được để trống'
      });
    }

    const updatedTask = await taskService.updateTask(id, userId, { 
      kanbanColumn: column 
    });

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

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
