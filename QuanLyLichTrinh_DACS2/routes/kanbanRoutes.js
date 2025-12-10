// routes/kanbanRoutes.js
const express = require('express');
const router = express.Router();
const kanbanController = require('../controllers/kanbanController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/api/kanban', kanbanController.getKanbanTasks);
router.patch('/api/kanban/:id/move', kanbanController.moveTaskToColumn);
router.get('/api/kanban/:id', kanbanController.getTaskDetail);
router.patch('/api/kanban/:id', kanbanController.updateTaskFromKanban);
router.delete('/api/kanban/:id', kanbanController.deleteTaskFromKanban);

module.exports = router;