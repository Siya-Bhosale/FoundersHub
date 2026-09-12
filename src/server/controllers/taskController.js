const mongoose = require('mongoose');
const Task = require('../models/Task');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');
const Department = require('../models/Department');
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
 * Auto-migrate any unpopulated historical tasks that have an assigned developer
 * to their active membership department in MongoDB.
 */
async function autoMigrateHistoricalTasks(startupId) {
  try {
    const unmigratedTasks = await Task.find({
      startup: startupId,
      department: null,
      assignedTo: { $ne: null },
    });

    if (unmigratedTasks.length > 0) {
      const memberships = await TeamMembership.find({
        startup: startupId,
        status: 'ACTIVE',
      });

      const userDeptMap = {};
      memberships.forEach((m) => {
        if (m.user && m.department) {
          userDeptMap[m.user.toString()] = m.department;
        }
      });

      const bulkOps = [];
      for (const t of unmigratedTasks) {
        const uId = t.assignedTo?.toString();
        if (uId && userDeptMap[uId]) {
          bulkOps.push({
            updateOne: {
              filter: { _id: t._id },
              update: { $set: { department: userDeptMap[uId] } },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await Task.bulkWrite(bulkOps);
      }
    }
  } catch (err) {
    console.error('Error auto-migrating historical tasks:', err.message);
  }
}

/**
 * POST /api/startups/:startupId/tasks
 * POST /api/tasks/startup/:startupId
 * Create a new task under a startup with strict department validation.
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
      department,
      departmentId,
      sprint,
      sprintId,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    // Resolve assigned developer
    const rawAssignee = assignedTo || developerId;
    let targetAssignee = null;
    let devMembership = null;

    if (rawAssignee && rawAssignee !== 'unassigned') {
      let assigneeIdStr = '';
      if (typeof rawAssignee === 'string' && mongoose.Types.ObjectId.isValid(rawAssignee)) {
        assigneeIdStr = rawAssignee;
      } else if (typeof rawAssignee === 'object') {
        assigneeIdStr = (rawAssignee._id || rawAssignee.id)?.toString() || '';
      }

      if (assigneeIdStr && mongoose.Types.ObjectId.isValid(assigneeIdStr)) {
        targetAssignee = new mongoose.Types.ObjectId(assigneeIdStr);
        devMembership = await TeamMembership.findOne({
          startup: startupId,
          user: targetAssignee,
          status: 'ACTIVE',
        });

        if (!devMembership) {
          return res.status(400).json({
            success: false,
            message: 'Assigned developer must be an active team member of this startup',
          });
        }
      }
    }

    // Resolve department
    const rawDept = department || departmentId;
    let targetDepartment = null;

    if (rawDept && rawDept !== 'ALL') {
      let deptIdStr = '';
      if (typeof rawDept === 'string' && mongoose.Types.ObjectId.isValid(rawDept)) {
        deptIdStr = rawDept;
      } else if (typeof rawDept === 'object') {
        deptIdStr = (rawDept._id || rawDept.id)?.toString() || '';
      }

      if (deptIdStr && mongoose.Types.ObjectId.isValid(deptIdStr)) {
        const deptDoc = await Department.findOne({ _id: deptIdStr, startup: startupId });
        if (!deptDoc) {
          return res.status(400).json({
            success: false,
            message: 'Specified department does not exist in this startup',
          });
        }
        targetDepartment = deptDoc._id;
      }
    }

    // Strict Cross-Department Assignment Validation:
    // If founder selects Department = Operations and Developer = John (who belongs to Development), REJECT
    if (targetAssignee && devMembership) {
      const devDeptId = devMembership.department ? devMembership.department.toString() : null;

      if (targetDepartment) {
        if (!devDeptId || devDeptId !== targetDepartment.toString()) {
          const expectedDept = await Department.findById(targetDepartment);
          const actualDept = devDeptId ? await Department.findById(devDeptId) : null;
          return res.status(400).json({
            success: false,
            message: `Selected developer belongs to ${actualDept ? actualDept.name : 'another department'}, not ${expectedDept ? expectedDept.name : 'the selected department'}. Cannot assign tasks across departments.`,
          });
        }
      } else if (devDeptId) {
        // Automatically derive task department from developer's active membership
        targetDepartment = devMembership.department;
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
      department: targetDepartment,
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
    await task.populate('department', 'name description isDefault');

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
 * List tasks for a startup with strict department-based authorization:
 * - If Founder: returns all startup tasks (with optional departmentId filter).
 * - If Developer (active team member):
 *     - view=my: returns ONLY tasks assigned directly to this developer.
 *     - view=all: returns ALL tasks belonging to the developer's CURRENT ACTIVE DEPARTMENT.
 *       (Tasks from other departments are strictly forbidden and never exposed).
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

    // Auto-migrate any unpopulated assigned historical tasks
    await autoMigrateHistoricalTasks(startupId);

    const view = (req.query.view || (access.isFounder ? 'all' : 'my')).toLowerCase();
    const query = { startup: startupId };

    let currentDepartment = null;

    if (access.isFounder) {
      // Founder view
      if (req.query.departmentId && req.query.departmentId !== 'ALL') {
        if (mongoose.Types.ObjectId.isValid(req.query.departmentId)) {
          query.department = new mongoose.Types.ObjectId(req.query.departmentId);
        }
      }
      if (view === 'my') {
        query.assignedTo = new mongoose.Types.ObjectId(userId);
      }
    } else {
      // DEVELOPER VIEW:
      // Determine department strictly from ACTIVE TeamMembership
      const devMembership = access.membership;
      const devDeptId = devMembership?.department;

      if (devDeptId) {
        const deptDoc = await Department.findById(devDeptId);
        if (deptDoc) {
          currentDepartment = {
            id: deptDoc._id.toString(),
            _id: deptDoc._id.toString(),
            name: deptDoc.name,
            description: deptDoc.description || '',
            isDefault: deptDoc.isDefault,
          };
        }
      }

      // If developer tries to supply another departmentId in query parameters, validate it!
      if (req.query.departmentId && req.query.departmentId !== 'ALL') {
        const requestedDeptStr = req.query.departmentId.toString();
        const devDeptStr = devDeptId ? devDeptId.toString() : '';

        if (!devDeptStr || requestedDeptStr !== devDeptStr) {
          return res.status(403).json({
            success: false,
            message: 'Forbidden: You cannot access tasks outside your department',
          });
        }
      }

      if (view === 'my') {
        // MY TASKS: Tasks assigned specifically to the logged-in developer
        query.assignedTo = new mongoose.Types.ObjectId(userId);
      } else {
        // ALL TASKS: ALL tasks belonging to the developer's CURRENT DEPARTMENT
        if (devDeptId) {
          query.department = devDeptId;
        } else {
          // If developer has no department assigned yet, only show tasks assigned to them
          query.assignedTo = new mongoose.Types.ObjectId(userId);
        }
      }
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('department', 'name description isDefault')
      .sort({ day: 1, createdAt: 1 });

    // Derive department fallback for formatting consistency
    const memberships = await TeamMembership.find({
      startup: startupId,
      status: 'ACTIVE',
    }).populate('department', 'name description isDefault');

    const memberDeptMap = {};
    memberships.forEach((m) => {
      const uId = (m.user?._id || m.user)?.toString();
      if (uId && m.department) {
        memberDeptMap[uId] = {
          id: m.department._id?.toString() || m.department.toString(),
          _id: m.department._id?.toString() || m.department.toString(),
          name: m.department.name,
          description: m.department.description || '',
          isDefault: m.department.isDefault,
        };
      }
    });

    const formattedTasks = tasks.map((t) => {
      const tObj = t.toObject ? t.toObject() : { ...t };
      const assigneeId = (t.assignedTo?._id || t.assignedTo)?.toString();
      tObj.derivedDepartment = t.department
        ? {
            id: t.department._id?.toString() || t.department.toString(),
            _id: t.department._id?.toString() || t.department.toString(),
            name: t.department.name,
            description: t.department.description || '',
            isDefault: t.department.isDefault,
          }
        : assigneeId && memberDeptMap[assigneeId]
        ? memberDeptMap[assigneeId]
        : null;
      return tObj;
    });

    return res.status(200).json({
      success: true,
      count: formattedTasks.length,
      data: formattedTasks,
      tasks: formattedTasks,
      isFounder: access.isFounder,
      currentDepartment,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching tasks' });
  }
};

/**
 * PUT /api/tasks/:taskId
 * Update task status, assignment, department, or details.
 * - Developer: can only update status of their own assigned task.
 * - Founder: can update all details, reassign, and change department with consistency checks.
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
      department,
      departmentId,
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
      await task.populate('department', 'name description isDefault');

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: task,
        task,
      });
    }

    // Founder update logic
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
      task.priority = priority;
    }
    if (day !== undefined) task.day = Number(day) || 1;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedHours !== undefined) task.estimatedHours = Number(estimatedHours) || 0;

    // Handle department update
    const rawDept = department !== undefined ? department : departmentId;
    let newDepartmentId = task.department;
    if (rawDept !== undefined) {
      if (!rawDept || rawDept === '' || rawDept === 'unassigned') {
        newDepartmentId = null;
      } else if (typeof rawDept === 'string' && mongoose.Types.ObjectId.isValid(rawDept)) {
        newDepartmentId = new mongoose.Types.ObjectId(rawDept);
      } else if (typeof rawDept === 'object') {
        const idStr = (rawDept._id || rawDept.id)?.toString();
        newDepartmentId = idStr && mongoose.Types.ObjectId.isValid(idStr) ? new mongoose.Types.ObjectId(idStr) : null;
      }
    }

    // Handle assignment update
    const rawAssignee = assignedTo !== undefined ? assignedTo : developerId;
    let newAssigneeId = task.assignedTo;
    if (rawAssignee !== undefined) {
      if (!rawAssignee || rawAssignee === '' || rawAssignee === 'unassigned') {
        newAssigneeId = null;
      } else if (typeof rawAssignee === 'string' && mongoose.Types.ObjectId.isValid(rawAssignee)) {
        newAssigneeId = new mongoose.Types.ObjectId(rawAssignee);
      } else if (typeof rawAssignee === 'object') {
        const idStr = (rawAssignee._id || rawAssignee.id)?.toString();
        newAssigneeId = idStr && mongoose.Types.ObjectId.isValid(idStr) ? new mongoose.Types.ObjectId(idStr) : null;
      }
    }

    // Validate developer & department consistency if assignee is provided
    if (newAssigneeId) {
      const devMembership = await TeamMembership.findOne({
        startup: task.startup,
        user: newAssigneeId,
        status: 'ACTIVE',
      });

      if (!devMembership) {
        return res.status(400).json({
          success: false,
          message: 'Assigned developer must be an active team member of this startup',
        });
      }

      const devDeptId = devMembership.department ? devMembership.department.toString() : null;

      if (newDepartmentId) {
        if (!devDeptId || devDeptId !== newDepartmentId.toString()) {
          const expectedDept = await Department.findById(newDepartmentId);
          const actualDept = devDeptId ? await Department.findById(devDeptId) : null;
          return res.status(400).json({
            success: false,
            message: `Selected developer belongs to ${actualDept ? actualDept.name : 'another department'}, not ${expectedDept ? expectedDept.name : 'the selected department'}.`,
          });
        }
      } else if (devDeptId) {
        // Auto-assign task department to match developer's department
        newDepartmentId = devMembership.department;
      }
    }

    task.assignedTo = newAssigneeId;
    task.department = newDepartmentId;

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
    await task.populate('department', 'name description isDefault');

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
 * Get tasks assigned to current logged-in developer across startups.
 */
const getMyTasks = async (req, res) => {
  try {
    const userId = (req.user.userId || req.user.id)?.toString();

    const tasks = await Task.find({ assignedTo: new mongoose.Types.ObjectId(userId) })
      .populate('startup', 'name stage industry')
      .populate('department', 'name description isDefault')
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
