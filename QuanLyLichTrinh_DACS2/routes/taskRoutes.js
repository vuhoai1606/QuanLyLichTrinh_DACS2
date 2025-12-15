// routes/taskRoutes.js - Đã kiểm tra, không cần chỉnh sửa

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/authMiddleware');

// Tất cả routes đều cần đăng nhập
router.use(requireAuth);

// API routes cho tasks
// Routes đặc biệt phải đặt TRƯỚC routes có parameter :id
router.get('/api/tasks', taskController.getTasks);
router.get('/api/tasks/today', taskController.getTodayTasks);
router.post('/api/tasks', taskController.createTask);
// Lấy thống kê nhanh cho Dashboard
router.get('/api/stats', taskController.getTaskStatistics);

// Routes đặc biệt với string cụ thể
router.patch('/api/tasks/:id/status', taskController.updateTaskStatus);
router.patch('/api/tasks/:id/kanban', taskController.updateTaskKanbanColumn); 

// Routes với :id parameter (đặt cuối)
router.get('/api/tasks/:id', taskController.getTaskById);
router.put('/api/tasks/:id', taskController.updateTask);
router.delete('/api/tasks/:id', taskController.deleteTask);

router.get('/api/categories', taskController.getCategories);
router.patch('/api/tasks/reorder', taskController.reorderTasks);

// Route mới để xác nhận hoàn thành task có overdue
router.post('/api/tasks/:id/confirm-complete', taskController.confirmTaskComplete);
module.exports = router;