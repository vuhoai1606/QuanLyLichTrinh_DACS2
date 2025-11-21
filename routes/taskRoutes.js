const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/authMiddleware');

// Tất cả routes đều cần đăng nhập
router.use(requireAuth);

// API routes cho tasks
router.get('/api/tasks', taskController.getTasks);
router.get('/api/tasks/:id', taskController.getTaskById);
router.post('/api/tasks', taskController.createTask);
router.put('/api/tasks/:id', taskController.updateTask);
router.delete('/api/tasks/:id', taskController.deleteTask);

// Routes đặc biệt
router.patch('/api/tasks/:id/status', taskController.updateTaskStatus);
router.patch('/api/tasks/:id/kanban', taskController.updateTaskKanbanColumn);

module.exports = router;
