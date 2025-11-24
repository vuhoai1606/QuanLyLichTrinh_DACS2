const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/authMiddleware');

// Tất cả routes đều cần đăng nhập
router.use(requireAuth);

// API routes cho tasks
// Routes đặc biệt phải đặt TRƯỚC routes có parameter :id
router.get('/api/tasks', taskController.getTasks);
router.post('/api/tasks', taskController.createTask);

// Routes đặc biệt với string cụ thể
router.patch('/api/tasks/:id/status', taskController.updateTaskStatus);
router.patch('/api/tasks/:id/kanban', taskController.updateTaskKanbanColumn);

// Routes với :id parameter (đặt cuối)
router.get('/api/tasks/:id', taskController.getTaskById);
router.put('/api/tasks/:id', taskController.updateTask);
router.delete('/api/tasks/:id', taskController.deleteTask);

module.exports = router;
