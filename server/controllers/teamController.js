const mongoose = require('mongoose');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');
const DeveloperProfile = require('../models/DeveloperProfile');

/**
 * GET /api/startups/:startupId/team
 * Get team members for a startup.
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

    // Fetch active team memberships
    const memberships = await TeamMembership.find({
      startup: startupId,
      status: 'ACTIVE',
    })
      .populate('user', 'name email role')
      .sort({ joinedAt: 1 });

    const developerUserIds = memberships
      .map((m) => m.user?._id)
      .filter(Boolean);

    const profiles = await DeveloperProfile.find({ user: { $in: developerUserIds } });
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    const members = memberships.map((m) => {
      const dev = m.user;
      const devProfile = dev ? profileMap[dev._id.toString()] : null;

      return {
        id: m._id.toString(),
        role: m.role || 'DEVELOPER',
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
              github: devProfile.github,
              linkedin: devProfile.linkedin,
              portfolio: devProfile.portfolio,
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

module.exports = {
  getStartupTeam,
};
