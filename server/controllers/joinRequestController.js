const mongoose = require('mongoose');
const JoinRequest = require('../models/JoinRequest');
const TeamMembership = require('../models/TeamMembership');
const Startup = require('../models/Startup');
const DeveloperProfile = require('../models/DeveloperProfile');

/**
 * Helper to safely extract founder user ID as a string from a Startup document,
 * whether populated or unpopulated.
 */
const getFounderId = (startup) => {
  if (!startup) return null;
  const f = startup.founder || startup.founderId;
  if (!f) return null;
  if (typeof f === 'object' && f._id) return f._id.toString();
  if (typeof f === 'object' && f.id) return f.id.toString();
  return f.toString();
};

/**
 * POST /api/join-requests or POST /api/join-requests/:startupId
 * Authenticated DEVELOPER submits a request to join a startup
 */
const createJoinRequest = async (req, res) => {
  try {
    const startupId = req.params?.startupId || req.body?.startupId;
    const message = req.body?.message;

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

    const developerUserId = (req.user?.userId || req.user?.id)?.toString();
    if (!developerUserId || !mongoose.Types.ObjectId.isValid(developerUserId)) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Prevent developer from requesting to join their own startup if they somehow own it
    const startupFounderId = getFounderId(startup);
    if (startupFounderId && startupFounderId === developerUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot join your own startup',
      });
    }

    // Check if developer is already an active member of this startup
    const existingMembership = await TeamMembership.findOne({
      startup: startup._id,
      user: developerUserId,
      status: 'ACTIVE',
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: 'You are already an active team member of this startup',
      });
    }

    // Prevent duplicate pending request
    const existingPending = await JoinRequest.findOne({
      startup: startup._id,
      developer: developerUserId,
      status: 'PENDING',
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending join request for this startup',
      });
    }

    if (message !== undefined && typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message must be a string',
      });
    }

    if (message && message.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 1000 characters',
      });
    }

    const request = await JoinRequest.create({
      startup: startup._id,
      developer: new mongoose.Types.ObjectId(developerUserId),
      message: message ? message.trim() : '',
      status: 'PENDING',
    });

    return res.status(201).json({
      success: true,
      message: 'Join request submitted successfully',
      request: {
        id: request._id.toString(),
        startup: request.startup.toString(),
        developer: request.developer.toString(),
        message: request.message,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    console.error('Create join request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while submitting join request',
    });
  }
};

/**
 * GET /api/join-requests/my
 * Authenticated DEVELOPER views their own submitted join requests
 */
const getMyJoinRequests = async (req, res) => {
  try {
    const developerUserId = (req.user?.userId || req.user?.id)?.toString();

    if (!developerUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const requests = await JoinRequest.find({ developer: developerUserId })
      .populate('startup', 'name tagline industry stage')
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map((r) => ({
      id: r._id.toString(),
      startup: r.startup
        ? {
            id: r.startup._id.toString(),
            name: r.startup.name,
            tagline: r.startup.tagline,
            industry: r.startup.industry,
            stage: r.startup.stage,
          }
        : null,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
    }));

    return res.status(200).json({
      success: true,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error('Get my join requests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching join requests',
    });
  }
};

/**
 * GET /api/startups/:startupId/join-requests OR /api/join-requests/startup/:startupId
 * Authenticated FOUNDER views all requests submitted to their startup
 */
const getStartupJoinRequests = async (req, res) => {
  try {
    const startupId = req.params?.startupId || req.params?.id;

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

    // Safe ObjectId string comparison for founder ownership
    const startupFounderId = getFounderId(startup);
    const currentUserId = (req.user?.userId || req.user?.id)?.toString();
    if (!startupFounderId || startupFounderId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this startup',
      });
    }

    const requests = await JoinRequest.find({ startup: startup._id })
      .populate('developer', 'name email role')
      .sort({ createdAt: -1 });

    // Fetch DeveloperProfiles for public skills/experience details
    const developerIds = requests
      .map((r) => r.developer?._id)
      .filter(Boolean);

    const profiles = await DeveloperProfile.find({ user: { $in: developerIds } });
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    const formattedRequests = requests.map((r) => {
      const dev = r.developer;
      const devProfile = dev ? profileMap[dev._id.toString()] : null;
      const skills = devProfile?.skills || dev?.skills || [];

      return {
        id: r._id.toString(),
        startup: r.startup.toString(),
        developer: dev
          ? {
              id: dev._id.toString(),
              name: dev.name,
              email: dev.email,
              role: dev.role,
              skills,
              profile: devProfile
                ? {
                    bio: devProfile.bio,
                    skills: devProfile.skills || [],
                    experience: devProfile.experience,
                    github: devProfile.github,
                    linkedin: devProfile.linkedin,
                    portfolio: devProfile.portfolio,
                    availability: devProfile.availability,
                  }
                : null,
            }
          : null,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
      };
    });

    return res.status(200).json({
      success: true,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error('Get startup join requests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup join requests',
    });
  }
};

/**
 * PUT /api/join-requests/:requestId/accept
 * Authenticated FOUNDER accepts a pending join request
 */
const acceptJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid request ID is required',
      });
    }

    const request = await JoinRequest.findById(requestId).populate('startup');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found',
      });
    }

    // Verify founder owns the startup associated with this request
    const startupFounderId = getFounderId(request.startup);
    const currentUserId = (req.user?.userId || req.user?.id)?.toString();
    if (!startupFounderId || startupFounderId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own the startup associated with this request',
      });
    }

    // Must currently be PENDING
    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Request cannot be accepted because it is already ${request.status}`,
      });
    }

    // Update request status
    request.status = 'ACCEPTED';
    request.reviewedAt = new Date();
    await request.save();

    // Create or activate TeamMembership
    let membership = await TeamMembership.findOne({
      startup: request.startup._id,
      user: request.developer,
    });

    if (membership) {
      membership.status = 'ACTIVE';
      membership.role = 'DEVELOPER';
      membership.joinedAt = new Date();
      await membership.save();
    } else {
      membership = await TeamMembership.create({
        startup: request.startup._id,
        user: request.developer,
        role: 'DEVELOPER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Join request accepted and developer added to team',
      request: {
        id: request._id.toString(),
        startup: request.startup._id.toString(),
        developer: request.developer.toString(),
        status: request.status,
        reviewedAt: request.reviewedAt,
      },
      membership: {
        id: membership._id.toString(),
        startup: membership.startup.toString(),
        user: membership.user.toString(),
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
      },
    });
  } catch (error) {
    console.error('Accept join request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while accepting join request',
    });
  }
};

/**
 * PUT /api/join-requests/:requestId/reject
 * Authenticated FOUNDER rejects a pending join request
 */
const rejectJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid request ID is required',
      });
    }

    const request = await JoinRequest.findById(requestId).populate('startup');
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found',
      });
    }

    // Verify founder owns the startup associated with this request
    const startupFounderId = getFounderId(request.startup);
    const currentUserId = (req.user?.userId || req.user?.id)?.toString();
    if (!startupFounderId || startupFounderId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own the startup associated with this request',
      });
    }

    // Must currently be PENDING
    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Request cannot be rejected because it is already ${request.status}`,
      });
    }

    // Update request status
    request.status = 'REJECTED';
    request.reviewedAt = new Date();
    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Join request rejected',
      request: {
        id: request._id.toString(),
        startup: request.startup._id.toString(),
        developer: request.developer.toString(),
        status: request.status,
        reviewedAt: request.reviewedAt,
      },
    });
  } catch (error) {
    console.error('Reject join request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while rejecting join request',
    });
  }
};

module.exports = {
  createJoinRequest,
  getMyJoinRequests,
  getStartupJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
};
