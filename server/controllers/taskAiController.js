const mongoose = require('mongoose');
const { generateTasksForStartup } = require('../services/taskAiService');
const Startup = require('../models/Startup');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');

/**
 * POST /api/ai/tasks/:startupId
 * Generate AI-powered MVP development tasks.
 * Allowed for startup founder or active members.
 */
const generateAiTasksHandler = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid startup ID is required',
      });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    const founderId = (startup.founder || startup.founderId)?.toString();
    if (!founderId || founderId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the startup founder can generate AI tasks',
      });
    }

    const result = await generateTasksForStartup(startupId, userId);

    return res.status(200).json({
      success: true,
      message: 'AI tasks generated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error generating AI tasks:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Server error while generating AI tasks',
    });
  }
};

/**
 * POST /api/tasks/batch/:startupId
 * Create multiple tasks in MongoDB after founder reviews AI preview.
 */
const createBatchTasksHandler = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();
    const { tasks } = req.body;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid startup ID is required',
      });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array of tasks is required',
      });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    const founderId = (startup.founder || startup.founderId)?.toString();
    if (!founderId || founderId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the founder can batch create tasks',
      });
    }

    const currentSprint = await Sprint.findOne({ startup: startupId, status: 'ACTIVE' }).sort({ createdAt: -1 });

    const createdTasks = [];
    for (const t of tasks) {
      if (!t.title || typeof t.title !== 'string') continue;

      const created = await Task.create({
        startup: startupId,
        sprint: currentSprint?._id || null,
        title: t.title.trim(),
        description: t.description || '',
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(t.priority) ? t.priority : 'MEDIUM',
        status: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].includes(t.status) ? t.status : 'TODO',
        day: Number(t.day) || 1,
        estimatedHours: Number(t.estimatedHours) || 3,
        assignedTo: t.assignedTo && mongoose.Types.ObjectId.isValid(t.assignedTo) ? t.assignedTo : null,
      });
      createdTasks.push(created);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdTasks.length} tasks`,
      count: createdTasks.length,
      data: createdTasks,
    });
  } catch (error) {
    console.error('Error creating batch tasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating batch tasks',
    });
  }
};

module.exports = {
  generateAiTasksHandler,
  createBatchTasksHandler,
};
