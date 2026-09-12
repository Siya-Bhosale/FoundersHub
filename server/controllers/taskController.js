const mongoose = require('mongoose');
const Task = require('../models/Task');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');
const Sprint = require('../models/Sprint');

/**
 * Checks if user is founder or active team member of startup.
 */
async function canAccessStartup(startupId, userId) {
  if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
    return { allowed: false, notFound: true };
  }

  const startup = await Startup.findById(startupId);
  if (!startup) return { allowed: false, notFound: true };

  const founderId = (startup.founder?._id || startup.founder || startup.founderId)?.toString();
  const currentUserId = userId ? userId.toString() : '';

  if (founderId && founderId === currentUserId) {
    return { allowed: true, startup, isFounder: true };
  }

  if (!mongoose.Types.ObjectId.isValid(currentUserId)) {
    return { allowed: false, startup, notFound: false };
  }

  const membership = await TeamMembership.findOne({
    startup: startupId,
    user: new mongoose.Types.ObjectId(currentUserId),
    status: 'ACTIVE',
  });

  if (membership) {
    return { allowed: true, startup, isFounder: false, membership };
  }

  return { allowed: false, startup, notFound: false };
}

/**
 * POST /api/startups/:startupId/tasks
 * POST /api/tasks/startup/:startupId
 * Create a new task under a startup.
 */
const createTask = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();

    const access = await canAccessStartup(startupId, userId);
    if (access.notFound) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
    }

    const {
      title,
      description,
      status,
      priority,
      day,
      dueDate,
      estimatedHours,
      assignedTo,
      developerId,
      sprint,
      sprintId,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    // Resolve assignedTo or developerId
    const rawAssignee = assignedTo || developerId;
    let targetAssignee = null;
    if (rawAssignee && typeof rawAssignee === 'string' && mongoose.Types.ObjectId.isValid(rawAssignee)) {
      targetAssignee = new mongoose.Types.ObjectId(rawAssignee);
    } else if (rawAssignee && typeof rawAssignee === 'object') {
      const idStr = (rawAssignee._id || rawAssignee.id)?.toString();
      if (idStr && mongoose.Types.ObjectId.isValid(idStr)) {
        targetAssignee = new mongoose.Types.ObjectId(idStr);
      }
    }

    // Associate with sprint if available
    let targetSprint = sprint || sprintId || null;
    if (!targetSprint) {
      const activeSprint = await Sprint.findOne({ startup: startupId, status: 'ACTIVE' }).sort({ createdAt: -1 });
      if (activeSprint) {
        targetSprint = activeSprint._id;
      }
    }

    const task = new Task({
      startup: startupId,
      sprint: targetSprint,
      title: title.trim(),
      description: description ? description.trim() : '',
      status: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].includes(status) ? status : 'TODO',
      priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority) ? priority : 'MEDIUM',
      day: day ? Number(day) : 1,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours: estimatedHours !== undefined ? Number(estimatedHours) : 2,
      assignedTo: targetAssignee,
      createdBy: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null,
      completedAt: status === 'DONE' ? new Date() : null,
    });

    await task.save();
    await task.populate('assignedTo', 'name email role');

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
      task,
    });
  } catch (error) {
    console.error('Error creating task:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while creating task' });
  }
};

/**
 * GET /api/startups/:startupId/tasks
 * GET /api/tasks/startup/:startupId
 * List tasks for a startup:
 * - If Founder: returns all tasks for this startup.
 * - If Developer (active team member): returns ONLY tasks assigned to this developer.
 * - If neither: 403 Forbidden.
 */
const getStartupTasks = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();

    const access = await canAccessStartup(startupId, userId);
    if (access.notFound) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
    }

    const query = { startup: startupId };
    if (!access.isFounder) {
      // Developer only sees tasks assigned to them
      query.assignedTo = new mongoose.Types.ObjectId(userId);
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .sort({ day: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
      tasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching tasks' });
  }
};

/**
 * PUT /api/tasks/:taskId
 * Update task status, assignment, or details.
 * - Developer: can only update status of their own assigned task.
 * - Founder: can update all details and reassign.
 */
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();

    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: 'Valid task ID is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const access = await canAccessStartup(task.startup, userId);
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied' });
    }

    const {
      title,
      description,
      status,
      priority,
      day,
      dueDate,
      estimatedHours,
      assignedTo,
      developerId,
    } = req.body;

    if (!access.isFounder) {
      // Developer access control: can only update status of own assigned task
      const assignedId = task.assignedTo ? task.assignedTo.toString() : null;
      if (!assignedId || assignedId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update tasks assigned to you',
        });
      }

      if (status !== undefined) {
        if (!['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].includes(status)) {
          return res.status(400).json({ success: false, message: 'Invalid task status' });
        }
        task.status = status;
        if (status === 'DONE' && !task.completedAt) {
          task.completedAt = new Date();
        } else if (status !== 'DONE') {
          task.completedAt = null;
        }
      }

      await task.save();
      await task.populate('assignedTo', 'name email role');

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: task,
        task,
      });
    }

    // Founder can update all task fields and reassign
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
      task.priority = priority;
    }
    if (day !== undefined) task.day = Number(day) || 1;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedHours !== undefined) task.estimatedHours = Number(estimatedHours) || 0;

    const rawAssignee = assignedTo !== undefined ? assignedTo : developerId;
    if (rawAssignee !== undefined) {
      if (!rawAssignee || rawAssignee === '' || rawAssignee === 'unassigned') {
        task.assignedTo = null;
      } else if (typeof rawAssignee === 'string' && mongoose.Types.ObjectId.isValid(rawAssignee)) {
        task.assignedTo = new mongoose.Types.ObjectId(rawAssignee);
      } else if (typeof rawAssignee === 'object') {
        const idStr = (rawAssignee._id || rawAssignee.id)?.toString();
        if (idStr && mongoose.Types.ObjectId.isValid(idStr)) {
          task.assignedTo = new mongoose.Types.ObjectId(idStr);
        } else {
          task.assignedTo = null;
        }
      }
    }

    if (status !== undefined) {
      if (['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].includes(status)) {
        task.status = status;
        if (status === 'DONE' && !task.completedAt) {
          task.completedAt = new Date();
        } else if (status !== 'DONE') {
          task.completedAt = null;
        }
      }
    }

    await task.save();
    await task.populate('assignedTo', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task,
      task,
    });
  } catch (error) {
    console.error('Error updating task:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating task' });
  }
};

/**
 * GET /api/tasks/my-tasks
 * Get tasks assigned to current logged-in developer.
 */
const getMyTasks = async (req, res) => {
  try {
    const userId = (req.user.userId || req.user.id)?.toString();

    const tasks = await Task.find({ assignedTo: new mongoose.Types.ObjectId(userId) })
      .populate('startup', 'name stage industry')
      .populate('sprint', 'name status')
      .populate('assignedTo', 'name email role')
      .sort({ dueDate: 1, createdAt: -1 });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'DONE').length;
    const now = new Date();
    const overdue = tasks.filter((t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now).length;
    const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    return res.status(200).json({
      success: true,
      count: total,
      summary: {
        total,
        completed,
        overdue,
        totalHours,
      },
      data: tasks,
      tasks,
    });
  } catch (error) {
    console.error('Error fetching my tasks:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching developer tasks' });
  }
};

module.exports = {
  createTask,
  getStartupTasks,
  updateTask,
  getMyTasks,
};
