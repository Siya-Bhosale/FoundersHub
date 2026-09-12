const mongoose = require('mongoose');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');
const DeveloperProfile = require('../models/DeveloperProfile');
const Department = require('../models/Department');
const Task = require('../models/Task');

/**
 * GET /api/startups/:startupId/team
 * Get team members for a startup with departments and task stats.
 * Allowed for startup founder and active team members.
 */
const getStartupTeam = async (req, res) => {
  try {
    const { startupId } = req.params;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid startup ID is required',
      });
    }

    const startup = await Startup.findById(startupId).populate('founder', 'name email role');
    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    const userId = (req.user.userId || req.user.id)?.toString();
    const founderId = (startup.founder?._id || startup.founder || startup.founderId?._id || startup.founderId)?.toString();
    const isFounder = Boolean(founderId && founderId === userId);

    let isMember = false;
    if (!isFounder) {
      const membership = await TeamMembership.findOne({
        startup: startupId,
        user: userId,
        status: 'ACTIVE',
      });
      if (membership) {
        isMember = true;
      }
    }

    // Only founder and active team members can view private team details
    if (!isFounder && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to view this team',
      });
    }

    // Fetch active team memberships with department populated
    const memberships = await TeamMembership.find({
      startup: startupId,
      status: 'ACTIVE',
    })
      .populate('user', 'name email role')
      .populate('department', 'name description')
      .sort({ joinedAt: 1 });

    const developerUserIds = memberships
      .map((m) => m.user?._id)
      .filter(Boolean);

    // Fetch profiles
    const profiles = await DeveloperProfile.find({ user: { $in: developerUserIds } });
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    // Compute task counts per developer
    const tasks = await Task.find({
      startup: startupId,
      assignedTo: { $in: developerUserIds },
    }).select('assignedTo status');

    const taskStatsMap = {};
    developerUserIds.forEach((uid) => {
      taskStatsMap[uid.toString()] = { active: 0, completed: 0, total: 0 };
    });

    tasks.forEach((t) => {
      const aId = t.assignedTo?.toString();
      if (taskStatsMap[aId]) {
        taskStatsMap[aId].total++;
        if (t.status === 'DONE') {
          taskStatsMap[aId].completed++;
        } else {
          taskStatsMap[aId].active++;
        }
      }
    });

    const members = memberships.map((m) => {
      const dev = m.user;
      const devProfile = dev ? profileMap[dev._id.toString()] : null;
      const devIdStr = dev ? dev._id.toString() : '';

      return {
        id: m._id.toString(),
        _id: m._id.toString(),
        role: m.role || 'DEVELOPER',
        departmentRole: m.departmentRole || '',
        department: m.department
          ? {
              id: m.department._id ? m.department._id.toString() : m.department.toString(),
              _id: m.department._id ? m.department._id.toString() : m.department.toString(),
              name: m.department.name || 'Department',
              description: m.department.description || '',
            }
          : null,
        taskStats: devIdStr && taskStatsMap[devIdStr]
          ? taskStatsMap[devIdStr]
          : { active: 0, completed: 0, total: 0 },
        status: m.status,
        joinedAt: m.joinedAt,
        user: dev
          ? {
              id: dev._id.toString(),
              _id: dev._id.toString(),
              name: dev.name,
              email: dev.email,
              role: dev.role,
            }
          : null,
        profile: devProfile
          ? {
              bio: devProfile.bio,
              skills: devProfile.skills,
              experience: devProfile.experience,
              education: devProfile.education || '',
              github: devProfile.github,
              linkedin: devProfile.linkedin,
              portfolio: devProfile.portfolio,
              twitter: devProfile.twitter || '',
              otherSocial: devProfile.otherSocial || '',
              resumeUrl: devProfile.resumeUrl || '',
              resumeFileName: devProfile.resumeFileName || '',
              resumeOriginalName: devProfile.resumeOriginalName || '',
              availability: devProfile.availability,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      founder: startup.founder
        ? {
            id: startup.founder._id.toString(),
            _id: startup.founder._id.toString(),
            name: startup.founder.name,
            email: startup.founder.email,
            role: 'FOUNDER',
          }
        : null,
      members,
    });
  } catch (error) {
    console.error('Get startup team error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup team',
    });
  }
};

/**
 * PUT /api/startups/:startupId/team/:membershipId/department
 * Founder reassigns a member to a new department or updates department role.
 */
const updateMemberDepartment = async (req, res) => {
  try {
    const { startupId, membershipId } = req.params;
    const { departmentId, departmentRole } = req.body;
    const userId = (req.user.userId || req.user.id)?.toString();

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Valid startup ID is required' });
    }

    if (!membershipId || !mongoose.Types.ObjectId.isValid(membershipId)) {
      return res.status(400).json({ success: false, message: 'Valid membership ID is required' });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    const founderId = (startup.founder?._id || startup.founder || startup.founderId)?.toString();
    if (!founderId || founderId !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only the founder can reassign member departments' });
    }

    const membership = await TeamMembership.findOne({ _id: membershipId, startup: startupId });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Team membership not found in this startup' });
    }

    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({ success: false, message: 'Valid department ID is required' });
      }
      const dept = await Department.findOne({ _id: departmentId, startup: startupId });
      if (!dept) {
        return res.status(404).json({ success: false, message: 'Department not found in this startup' });
      }
      membership.department = dept._id;
    } else {
      membership.department = null;
    }

    if (departmentRole !== undefined) {
      membership.departmentRole = typeof departmentRole === 'string' ? departmentRole.trim() : '';
    }

    await membership.save();
    await membership.populate('department', 'name description');

    return res.status(200).json({
      success: true,
      message: 'Member department updated successfully',
      membership: {
        id: membership._id.toString(),
        _id: membership._id.toString(),
        startup: membership.startup.toString(),
        user: membership.user.toString(),
        role: membership.role,
        departmentRole: membership.departmentRole,
        department: membership.department
          ? {
              id: membership.department._id.toString(),
              _id: membership.department._id.toString(),
              name: membership.department.name,
              description: membership.department.description,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Update member department error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating member department',
    });
  }
};

module.exports = {
  getStartupTeam,
  updateMemberDepartment,
};
