const pool = require('../config/db');

// Lấy danh sách tasks của user
exports.getTasks = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await pool.query(
      `SELECT task_id, title, description, start_time, end_time, 
              is_all_day, repeat_type, priority, status, kanban_column,
              created_at, updated_at
       FROM tasks 
       WHERE user_id = $1 
       ORDER BY start_time DESC`,
      [userId]
    );
    
    res.json({ 
      success: true, 
      tasks: result.rows 
    });
  } catch (error) {
    console.error('Lỗi lấy tasks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể lấy danh sách công việc' 
    });
  }
};

// Lấy chi tiết 1 task
exports.getTaskById = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM tasks WHERE task_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy công việc' 
      });
    }
    
    res.json({ 
      success: true, 
      task: result.rows[0] 
    });
  } catch (error) {
    console.error('Lỗi lấy task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể lấy thông tin công việc' 
    });
  }
};

// Tạo task mới
exports.createTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { 
      title, 
      description, 
      start_time, 
      end_time, 
      is_all_day, 
      repeat_type, 
      priority, 
      status,
      kanban_column 
    } = req.body;
    
    // Validation
    if (!title || !start_time) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tiêu đề và thời gian bắt đầu là bắt buộc' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO tasks (
        user_id, title, description, start_time, end_time, 
        is_all_day, repeat_type, priority, status, kanban_column
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        userId, 
        title, 
        description || null, 
        start_time, 
        end_time || null,
        is_all_day || false,
        repeat_type || 'none',
        priority || 'medium',
        status || 'pending',
        kanban_column || 'todo'
      ]
    );
    
    res.json({ 
      success: true, 
      message: 'Thêm công việc thành công',
      task: result.rows[0] 
    });
  } catch (error) {
    console.error('Lỗi tạo task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể thêm công việc' 
    });
  }
};

// Cập nhật task
exports.updateTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { 
      title, 
      description, 
      start_time, 
      end_time, 
      is_all_day, 
      repeat_type, 
      priority, 
      status,
      kanban_column 
    } = req.body;
    
    // Kiểm tra task có tồn tại và thuộc về user không
    const checkResult = await pool.query(
      'SELECT task_id FROM tasks WHERE task_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy công việc' 
      });
    }
    
    const result = await pool.query(
      `UPDATE tasks 
       SET title = $1, description = $2, start_time = $3, end_time = $4,
           is_all_day = $5, repeat_type = $6, priority = $7, status = $8,
           kanban_column = $9
       WHERE task_id = $10 AND user_id = $11 
       RETURNING *`,
      [
        title, 
        description, 
        start_time, 
        end_time,
        is_all_day,
        repeat_type,
        priority,
        status,
        kanban_column,
        id, 
        userId
      ]
    );
    
    res.json({ 
      success: true, 
      message: 'Cập nhật công việc thành công',
      task: result.rows[0] 
    });
  } catch (error) {
    console.error('Lỗi cập nhật task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể cập nhật công việc' 
    });
  }
};

// Xóa task
exports.deleteTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM tasks WHERE task_id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy công việc' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Xóa công việc thành công' 
    });
  } catch (error) {
    console.error('Lỗi xóa task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể xóa công việc' 
    });
  }
};

// Cập nhật trạng thái task (nhanh)
exports.updateTaskStatus = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'in_progress', 'done'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trạng thái không hợp lệ' 
      });
    }
    
    const result = await pool.query(
      'UPDATE tasks SET status = $1 WHERE task_id = $2 AND user_id = $3 RETURNING *',
      [status, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy công việc' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Cập nhật trạng thái thành công',
      task: result.rows[0] 
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể cập nhật trạng thái' 
    });
  }
};

// Cập nhật cột Kanban
exports.updateTaskKanbanColumn = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { kanban_column } = req.body;
    
    const result = await pool.query(
      'UPDATE tasks SET kanban_column = $1 WHERE task_id = $2 AND user_id = $3 RETURNING *',
      [kanban_column, id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy công việc' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Cập nhật vị trí thành công',
      task: result.rows[0] 
    });
  } catch (error) {
    console.error('Lỗi cập nhật Kanban:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể cập nhật vị trí' 
    });
  }
};
