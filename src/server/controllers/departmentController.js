const mongoose = require('mongoose');
const Department = require('../models/Department');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');

const DEFAULT_DEPARTMENTS = [
  { name: 'Technical', description: 'Core architecture, backend systems, and infrastructure' },
  { name: 'Development', description: 'Full stack, frontend, and feature engineering' },
  { name: 'Design', description: 'UI/UX design, visual creative, and user experience' },
  { name: 'Marketing', description: 'Growth marketing, brand narrative, and community' },
  { name: 'Sales', description: 'Business development, client outreach, and revenue' },
  { name: 'Finance', description: 'Capital allocation, accounting, and unit economics' },
  { name: 'Operations', description: 'Delivery execution, project agility, and resources' },
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

    // If startup has 0 departments, auto-seed defaults
    if (departments.length === 0) {
      const founderId = (startup.founder?._id || startup.founder || startup.founderId)?.toString();
      const docsToInsert = DEFAULT_DEPARTMENTS.map((d) => ({
        startup: startupId,
        name: d.name,
        description: d.description,
        createdBy: founderId && mongoose.Types.ObjectId.isValid(founderId) ? founderId : null,
      }));

      try {
        await Department.insertMany(docsToInsert, { ordered: false });
        departments = await Department.find({ startup: startupId }).sort({ createdAt: 1 });
      } catch (seedErr) {
        // In case of parallel race condition
        departments = await Department.find({ startup: startupId }).sort({ createdAt: 1 });
      }
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

    const formattedDepartments = departments.map((d) => ({
      id: d._id.toString(),
      _id: d._id.toString(),
      startup: d.startup.toString(),
      name: d.name,
      description: d.description || '',
      memberCount: countMap[d._id.toString()] || 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

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
 * DELETE /api/startups/:startupId/departments/:departmentId
 * Founder deletes a department (checks if members exist, supports ?force=true)
 */
const deleteDepartment = async (req, res) => {
  try {
    const { startupId, departmentId } = req.params;
    const userId = (req.user.userId || req.user.id)?.toString();
    const force = req.query.force === 'true';

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

    // Check if active members exist in this department
    const activeMembersCount = await TeamMembership.countDocuments({
      startup: startupId,
      department: departmentId,
      status: 'ACTIVE',
    });

    if (activeMembersCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        requiresConfirmation: true,
        activeMembersCount,
        message: `Department "${department.name}" has ${activeMembersCount} active member(s). Move them or pass force=true to reassign them to Unassigned.`,
      });
    }

    // If force is true or no members, unassign any remaining memberships
    await TeamMembership.updateMany(
      { startup: startupId, department: departmentId },
      { $set: { department: null } }
    );

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
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
