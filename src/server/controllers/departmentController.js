const mongoose = require('mongoose');
const Department = require('../models/Department');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');
const Chat = require('../models/Chat');

const DEFAULT_DEPARTMENTS = [
  { name: 'Technical', description: 'Core architecture, backend systems, and infrastructure' },
  { name: 'Development', description: 'Full stack, frontend, and feature engineering' },
  { name: 'Design', description: 'UI/UX design, visual creative, and user experience' },
  { name: 'Marketing', description: 'Growth marketing, brand narrative, and community' },
  { name: 'Sales', description: 'Business development, client outreach, and revenue' },
  { name: 'Finance', description: 'Capital allocation, accounting, and unit economics' },
  { name: 'Operations', description: 'Delivery execution, project agility, and resources' },
  { name: 'Product', description: 'Product strategy, roadmap planning, and user research' },
  { name: 'Customer Support', description: 'Customer success, issue resolution, and client support' },
];

/**
 * Helper to check if current user is the startup founder
 */
const isStartupFounder = async (startupId, userId) => {
  const startup = await Startup.findById(startupId);
  if (!startup) return { exists: false, isFounder: false };
  const founderId = (startup.founder?._id || startup.founder || startup.founderId)?.toString();
  const currentUserId = userId ? userId.toString() : '';
  return {
    exists: true,
    startup,
    isFounder: Boolean(founderId && founderId === currentUserId),
  };
};

/**
 * GET /api/startups/:startupId/departments
 * or GET /api/departments/startup/:startupId
 * Retrieve all departments for a startup (auto-seeds defaults if none exist)
 */
const getStartupDepartments = async (req, res) => {
  try {
    const { startupId } = req.params;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Valid startup ID is required' });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    let departments = await Department.find({ startup: startupId }).sort({ createdAt: 1 });
    const founderId = (startup.founder?._id || startup.founder || startup.founderId)?.toString();

    // Auto-seed all default departments if none exist or seed any missing defaults
    if (departments.length === 0) {
      const docsToInsert = DEFAULT_DEPARTMENTS.map((d) => ({
        startup: startupId,
        name: d.name,
        description: d.description,
        isDefault: true,
        createdBy: founderId && mongoose.Types.ObjectId.isValid(founderId) ? founderId : null,
      }));

      try {
        await Department.insertMany(docsToInsert, { ordered: false });
      } catch (seedErr) {
        // Race condition fallback
      }
      departments = await Department.find({ startup: startupId }).sort({ createdAt: 1 });
    } else {
      // Ensure missing defaults (e.g., Product, Customer Support) are added if startup was seeded with older defaults
      const existingNames = new Set(departments.map((d) => d.name.toLowerCase()));
      const missingDefaults = DEFAULT_DEPARTMENTS.filter((d) => !existingNames.has(d.name.toLowerCase()));
      if (missingDefaults.length > 0) {
        const missingDocs = missingDefaults.map((d) => ({
          startup: startupId,
          name: d.name,
          description: d.description,
          isDefault: true,
          createdBy: founderId && mongoose.Types.ObjectId.isValid(founderId) ? founderId : null,
        }));
        try {
          await Department.insertMany(missingDocs, { ordered: false });
          departments = await Department.find({ startup: startupId }).sort({ createdAt: 1 });
        } catch (e) {
          // ignore duplicate race condition
        }
      }
    }

    // Automatically ensure private department group chat exists for each department
    for (const dept of departments) {
      try {
        await Chat.updateOne(
          { startup: startupId, department: dept._id, type: 'DEPARTMENT' },
          { $setOnInsert: { name: `${dept.name} Team Chat`, type: 'DEPARTMENT' } },
          { upsert: true }
        );
      } catch (chatErr) {}
    }

    // Attach active member count to each department
    const departmentIds = departments.map((d) => d._id);
    const counts = await TeamMembership.aggregate([
      {
        $match: {
          startup: new mongoose.Types.ObjectId(startupId),
          department: { $in: departmentIds },
          status: 'ACTIVE',
        },
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const defaultNamesSet = new Set(DEFAULT_DEPARTMENTS.map((d) => d.name.toLowerCase()));

    const formattedDepartments = departments.map((d) => {
      const isDefault = Boolean(d.isDefault || defaultNamesSet.has(d.name.toLowerCase()));
      return {
        id: d._id.toString(),
        _id: d._id.toString(),
        startup: d.startup.toString(),
        name: d.name,
        description: d.description || '',
        isDefault,
        memberCount: countMap[d._id.toString()] || 0,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedDepartments.length,
      departments: formattedDepartments,
      data: formattedDepartments,
    });
  } catch (error) {
    console.error('Error fetching departments:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching departments' });
  }
};

/**
 * POST /api/startups/:startupId/departments
 * Founder creates a new department
 */
const createDepartment = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();

    const { exists, isFounder } = await isStartupFounder(startupId, userId);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!isFounder) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only the startup founder can create departments' });
    }

    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      return res.status(400).json({ success: false, message: 'Department name cannot exceed 100 characters' });
    }

    // Check duplicate
    const existing = await Department.findOne({
      startup: startupId,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A department with this name already exists in this startup' });
    }

    const department = await Department.create({
      startup: startupId,
      name: trimmedName,
      description: description && typeof description === 'string' ? description.trim() : '',
      createdBy: userId,
    });

    // Automatically create its dedicated department chat
    try {
      await Chat.create({
        startup: startupId,
        department: department._id,
        name: `${department.name} Team Chat`,
        type: 'DEPARTMENT',
      });
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department: {
        id: department._id.toString(),
        _id: department._id.toString(),
        startup: department.startup.toString(),
        name: department.name,
        description: department.description,
        memberCount: 0,
        createdAt: department.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating department:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while creating department' });
  }
};

/**
 * PUT /api/startups/:startupId/departments/:departmentId
 * Founder updates/renames a department
 */
const updateDepartment = async (req, res) => {
  try {
    const { startupId, departmentId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();

    const { exists, isFounder } = await isStartupFounder(startupId, userId);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!isFounder) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only the founder can manage departments' });
    }

    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ success: false, message: 'Valid department ID is required' });
    }

    const department = await Department.findOne({ _id: departmentId, startup: startupId });
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found in this startup' });
    }

    const { name, description } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Department name cannot be empty' });
      }
      const trimmedName = name.trim();
      const duplicate = await Department.findOne({
        startup: startupId,
        _id: { $ne: departmentId },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Another department with this name already exists' });
      }
      department.name = trimmedName;
    }

    if (description !== undefined) {
      department.description = typeof description === 'string' ? description.trim() : '';
    }

    await department.save();

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      department: {
        id: department._id.toString(),
        _id: department._id.toString(),
        startup: department.startup.toString(),
        name: department.name,
        description: department.description,
        updatedAt: department.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating department:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating department' });
  }
};

/**
 * GET /api/startups/:startupId/departments/:departmentId
 * or GET /api/departments/:departmentId
 * Retrieve single department details and its active members
 */
const getDepartmentById = async (req, res) => {
  try {
    const { startupId, departmentId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();

    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ success: false, message: 'Valid department ID is required' });
    }

    const department = await Department.findById(departmentId).populate('startup');
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const actualStartupId = department.startup?._id || department.startup;
    if (startupId && startupId !== actualStartupId.toString()) {
      return res.status(400).json({ success: false, message: 'Department does not belong to this startup' });
    }

    // Check authorization: user is founder, active member of the startup, or admin
    const { isFounder } = await isStartupFounder(actualStartupId, userId);
    const membership = await TeamMembership.findOne({
      startup: actualStartupId,
      user: userId,
      status: 'ACTIVE',
    });

    if (!isFounder && !membership && req.user.role !== 'FOUNDER') {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this startup workspace' });
    }

    // Get active members belonging to this department
    const members = await TeamMembership.find({
      startup: actualStartupId,
      department: departmentId,
      status: 'ACTIVE',
    })
      .populate('user', 'name email role')
      .lean();

    const DeveloperProfile = require('../models/DeveloperProfile');
    const Task = require('../models/Task');

    const membersWithProfiles = await Promise.all(
      members.map(async (m) => {
        const devUserId = m.user?._id;
        const profile = devUserId ? await DeveloperProfile.findOne({ user: devUserId }).lean() : null;

        let taskStats = { active: 0, completed: 0, total: 0 };
        if (devUserId) {
          const tasks = await Task.find({ startup: actualStartupId, assignedTo: devUserId }).select('status');
          taskStats = {
            total: tasks.length,
            active: tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS' || t.status === 'BLOCKED').length,
            completed: tasks.filter((t) => t.status === 'DONE').length,
          };
        }

        return {
          id: m._id.toString(),
          _id: m._id.toString(),
          user: m.user,
          role: m.role,
          department: department._id.toString(),
          departmentRole: m.departmentRole || 'Developer',
          profile,
          taskStats,
          createdAt: m.createdAt,
        };
      })
    );

    const defaultNamesSet = new Set(DEFAULT_DEPARTMENTS.map((d) => d.name.toLowerCase()));
    const isDefault = Boolean(department.isDefault || defaultNamesSet.has(department.name.toLowerCase()));

    return res.status(200).json({
      success: true,
      department: {
        id: department._id.toString(),
        _id: department._id.toString(),
        startup: actualStartupId.toString(),
        name: department.name,
        description: department.description || '',
        isDefault,
        memberCount: membersWithProfiles.length,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      },
      members: membersWithProfiles,
    });
  } catch (error) {
    console.error('Error fetching department by ID:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching department' });
  }
};

/**
 * DELETE /api/startups/:startupId/departments/:departmentId
 * Founder deletes a department (disallows default departments and departments with active members)
 */
const deleteDepartment = async (req, res) => {
  try {
    const { startupId, departmentId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();

    const { exists, isFounder } = await isStartupFounder(startupId, userId);
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!isFounder) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only the founder can delete departments' });
    }

    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return res.status(400).json({ success: false, message: 'Valid department ID is required' });
    }

    const department = await Department.findOne({ _id: departmentId, startup: startupId });
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found in this startup' });
    }

    // Default departments cannot be deleted
    const defaultNamesSet = new Set(DEFAULT_DEPARTMENTS.map((d) => d.name.toLowerCase()));
    if (department.isDefault || defaultNamesSet.has(department.name.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Default departments cannot be deleted',
      });
    }

    // Check if active members exist in this department
    const activeMembersCount = await TeamMembership.countDocuments({
      startup: startupId,
      department: departmentId,
      status: 'ACTIVE',
    });

    if (activeMembersCount > 0) {
      return res.status(400).json({
        success: false,
        activeMembersCount,
        message: 'This department has active members. Move the members to another department before deleting it.',
      });
    }

    await Department.findByIdAndDelete(departmentId);

    return res.status(200).json({
      success: true,
      message: `Department "${department.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting department:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while deleting department' });
  }
};

module.exports = {
  getStartupDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
