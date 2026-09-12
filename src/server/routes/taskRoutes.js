const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createTask,
  getStartupTasks,
  updateTask,
  getMyTasks,
} = require('../controllers/taskController');

const { createBatchTasksHandler } = require('../controllers/taskAiController');

// Developer personal task dashboard
router.get('/my-tasks', authMiddleware, getMyTasks);

// Individual task update
router.put('/:taskId', authMiddleware, updateTask);

// Startup task routes
router.post('/startup/:startupId', authMiddleware, createTask);
router.get('/startup/:startupId', authMiddleware, getStartupTasks);
router.post('/batch/:startupId', authMiddleware, createBatchTasksHandler);

module.exports = router;
