const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService'); // THÊM DÒNG NÀY

// controllers/kanbanController.js
exports.getKanbanTasks = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

    // ĐÚNG: truyền { groupByKanban: true }
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
    if (!['todo', 'in_progress', 'done'].includes(column)) {
      return res.status(400).json({ success: false, message: 'Cột không hợp lệ' });
    }

    let newStatus;
    if (column === 'todo') {
        newStatus = 'pending';
    } else if (column === 'in_progress') {
        newStatus = 'in_progress';
    } else if (column === 'done') {
        newStatus = 'done';
    } else {
        newStatus = 'pending';
    }

    const updatedTask = await taskService.updateTask(id, userId, { 
      kanbanColumn: column, // Cột Kanban (cho trang Kanban)
      status: newStatus      // Trạng thái (cho trang Tasks List)
    });

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