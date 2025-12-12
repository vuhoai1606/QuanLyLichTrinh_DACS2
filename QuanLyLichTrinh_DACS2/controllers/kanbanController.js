const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService');

// controllers/kanbanController.js
exports.getKanbanTasks = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

    // truyền dữ liệu groupByKanban: true
    const data = await taskService.getTasksByUser(userId, { groupByKanban: true });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error loading Kanban:', error);
    res.status(500).json({ success: false, message: 'Lỗi tải Kanban' });
  }
};

exports.moveTaskToColumn = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { column } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    
    // THÊM 'overdue' vào danh sách cột hợp lệ
    if (!['todo', 'in_progress', 'done', 'overdue'].includes(column)) { 
      return res.status(400).json({ success: false, message: 'Cột không hợp lệ' });
    }

    let newStatus;
    // 🌟 FIX 3: Tính toán newStatus dựa trên cột Kanban
    if (column === 'done') {
        newStatus = 'done';
    } else if (column === 'in_progress') {
        newStatus = 'in_progress';
    } else if (column === 'overdue') {
        newStatus = 'overdue'; // ✅ FIX: Đảm bảo status là 'overdue'
    } else {
        newStatus = 'todo'; // todo
    }
    
    const updateData = {
      kanbanColumn: column, // Cột Kanban
      status: newStatus,     // Trạng thái đồng bộ (FIXED)
    };
    
    const updatedTask = await taskService.updateTask(id, userId, updateData);

    if (!updatedTask) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy task' });
    }

    // THÊM: TẠO NOTI KHI DI CHUYỂN COLUMN
    await notificationService.createNotification({
      userId,
      type: 'task',
      title: 'Di chuyển công việc',
      message: `Công việc "${updatedTask.title}" đã được di chuyển đến cột "${column}"`,
      redirectUrl: '/tasks',
      relatedId: updatedTask.task_id
    });

    res.json({
      success: true,
      message: 'Di chuyển task thành công',
      data: updatedTask
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getTaskDetail = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const task = await taskService.getTaskById(id, userId);

    if (!task) {
      return res.status(404).json({ success: false, message: "Không tìm thấy task" });
    }

    res.json({ success: true, data: task });
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết task:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

exports.updateTaskFromKanban = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const body = req.body;

    // Cập nhật task
    const updated = await taskService.updateTask(id, userId, body);

    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy task" });
    }

    // Gửi thông báo
    await notificationService.createNotification({
      userId,
      type: "task",
      title: "Cập nhật task",
      message: `Bạn vừa cập nhật công việc "${updated.title}"`,
      redirectUrl: "/tasks",
      relatedId: updated.task_id
    });

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: updated
    });
  } catch (err) {
    console.error("Lỗi update task:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

exports.deleteTaskFromKanban = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const deleted = await taskService.deleteTask(id, userId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Không tìm thấy task" });
    }

    res.json({
      success: true,
      message: "Xóa task thành công"
    });
  } catch (err) {
    console.error("Lỗi xóa task:", err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const updatedTask = await taskService.updateTask(id, userId, req.body);

    res.json({
      success: true,
      message: "Cập nhật task thành công",
      data: updatedTask
    });

  } catch (error) {
    console.error("Lỗi update task:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const deleted = await taskService.deleteTask(id, userId);

    res.json({
      success: true,
      message: "Xóa task thành công",
      data: deleted
    });

  } catch (error) {
    console.error("Lỗi xóa task:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
