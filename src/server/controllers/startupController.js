const mongoose = require('mongoose');
const Startup = require('../models/Startup');
const JoinRequest = require('../models/JoinRequest');
const TeamMembership = require('../models/TeamMembership');
const User = require('../models/User');

const ALLOWED_STAGES = ['IDEA', 'MVP', 'EARLY_TRACTION', 'GROWTH'];

const createStartup = async (req, res) => {
  try {
    const { name, tagline, problemStatement, solution, industry, stage, description } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Startup name is required',
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Startup name cannot exceed 100 characters',
      });
    }

    if (!tagline || typeof tagline !== 'string' || !tagline.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tagline is required',
      });
    }

    if (tagline.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Tagline cannot exceed 200 characters',
      });
    }

    if (!problemStatement || typeof problemStatement !== 'string' || !problemStatement.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Problem statement is required',
      });
    }

    if (!solution || typeof solution !== 'string' || !solution.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Solution is required',
      });
    }

    if (!industry || typeof industry !== 'string' || !industry.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Industry is required',
      });
    }

    if (!stage || !ALLOWED_STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: 'Stage must be IDEA, MVP, EARLY_TRACTION, or GROWTH',
      });
    }

    const startup = await Startup.create({
      name: name.trim(),
      tagline: tagline.trim(),
      problemStatement: problemStatement.trim(),
      solution: solution.trim(),
      industry: industry.trim(),
      stage,
      description: description && typeof description === 'string' ? description.trim() : '',
      founder: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Startup created successfully',
      startup: {
        id: startup._id.toString(),
        name: startup.name,
        tagline: startup.tagline,
        problemStatement: startup.problemStatement,
        solution: startup.solution,
        industry: startup.industry,
        stage: startup.stage,
        description: startup.description,
        founder: startup.founder.toString(),
        createdAt: startup.createdAt,
        updatedAt: startup.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create startup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating startup',
    });
  }
};

const getMyStartups = async (req, res) => {
  try {
    const userId = (req.user?.userId || req.user?.id || req.user?._id)?.toString();
    const userRole = (req.user?.role || '').toUpperCase();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // ==========================================
    // 1. DEVELOPER ROLE
    // ==========================================
    if (userRole === 'DEVELOPER') {
      const memberships = await TeamMembership.find({
        user: new mongoose.Types.ObjectId(userId),
        status: 'ACTIVE',
      })
        .populate({
          path: 'startup',
          populate: { path: 'founder', select: 'name email role' },
        })
        .populate('department', 'name description isDefault')
        .sort({ createdAt: -1 });

      const formattedStartups = await Promise.all(
        memberships.map(async (m) => {
          const s = m.startup;
          if (!s) return null;

          const teamCount = await TeamMembership.countDocuments({
            startup: s._id,
            status: 'ACTIVE',
          });

          const deptObj = m.department
            ? {
                id: m.department._id ? m.department._id.toString() : m.department.toString(),
                _id: m.department._id ? m.department._id.toString() : m.department.toString(),
                name: m.department.name || 'General',
                description: m.department.description || '',
                isDefault: m.department.isDefault,
              }
            : null;

          const membershipObj = {
            id: m._id.toString(),
            _id: m._id.toString(),
            department: deptObj,
            departmentRole: m.departmentRole || 'Developer',
            role: m.departmentRole || 'Developer',
            status: m.status,
            joinedAt: m.createdAt,
          };

          return {
            id: s._id.toString(),
            _id: s._id.toString(),
            name: s.name,
            tagline: s.tagline,
            problemStatement: s.problemStatement,
            solution: s.solution,
            industry: s.industry,
            stage: s.stage,
            description: s.description,
            founder: s.founder,
            teamSize: teamCount + 1, // members + founder
            role: m.departmentRole || 'Developer',
            department: deptObj,
            membership: membershipObj,
            startup: {
              id: s._id.toString(),
              _id: s._id.toString(),
              name: s.name,
              tagline: s.tagline,
              industry: s.industry,
              stage: s.stage,
              description: s.description,
            },
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          };
        })
      );

      const cleanList = formattedStartups.filter(Boolean);

      const membershipsMap = {};
      cleanList.forEach((item) => {
        const sId = item._id || item.id;
        membershipsMap[sId] = {
          startupId: sId,
          departmentId: item.department?.id || item.department?._id,
          departmentName: item.department?.name,
          departmentRole: item.membership?.departmentRole || item.role,
          status: item.membership?.status || 'ACTIVE',
        };
      });

      return res.status(200).json({
        success: true,
        count: cleanList.length,
        startups: cleanList,
        memberships: membershipsMap,
        role: 'DEVELOPER',
      });
    }

    // ==========================================
    // 2. FOUNDER ROLE (or default)
    // ==========================================
    const startups = await Startup.find({
      $or: [{ founder: userId }, { founderId: userId }],
    }).sort({ createdAt: -1 });

    const startupIds = startups.map((s) => s._id);
    const pendingCounts = await JoinRequest.aggregate([
      {
        $match: {
          startup: { $in: startupIds },
          status: 'PENDING',
        },
      },
      {
        $group: {
          _id: '$startup',
          count: { $sum: 1 },
        },
      },
    ]);

    const pendingMap = {};
    pendingCounts.forEach((p) => {
      pendingMap[p._id.toString()] = p.count;
    });

    const formattedStartups = await Promise.all(
      startups.map(async (s) => {
        const teamCount = await TeamMembership.countDocuments({
          startup: s._id,
          status: 'ACTIVE',
        });

        return {
          id: s._id.toString(),
          _id: s._id.toString(),
          name: s.name,
          tagline: s.tagline,
          problemStatement: s.problemStatement,
          solution: s.solution,
          industry: s.industry,
          stage: s.stage,
          description: s.description,
          founder: (s.founder || s.founderId)?.toString() || null,
          teamSize: teamCount + 1,
          pendingRequestsCount: pendingMap[s._id.toString()] || 0,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: formattedStartups.length,
      startups: formattedStartups,
      role: 'FOUNDER',
    });
  } catch (error) {
    console.error('Get my startups error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startups',
    });
  }
};

const getStartupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID',
      });
    }

    const startup = await Startup.findById(id).populate('founder', 'name email role');

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    const founderObj = startup.founder || startup.founderId;
    let founderData = null;
    if (founderObj && typeof founderObj === 'object' && founderObj._id) {
      founderData = {
        id: founderObj._id.toString(),
        name: founderObj.name,
        email: founderObj.email,
        role: founderObj.role,
      };
    } else if (founderObj) {
      const founderUser = await User.findById(founderObj).select('name email role');
      if (founderUser) {
        founderData = {
          id: founderUser._id.toString(),
          name: founderUser.name,
          email: founderUser.email,
          role: founderUser.role,
        };
      } else {
        founderData = founderObj.toString();
      }
    }

    return res.status(200).json({
      success: true,
      startup: {
        id: startup._id.toString(),
        name: startup.name,
        tagline: startup.tagline,
        problemStatement: startup.problemStatement,
        solution: startup.solution,
        industry: startup.industry,
        stage: startup.stage,
        description: startup.description,
        founder: founderData,
        aiAnalysis: startup.aiAnalysis || null,
        initialCapital: startup.initialCapital || 0,
        fundingRequired: startup.fundingRequired || 0,
        fundingReceived: startup.fundingReceived || 0,
        targetRunwayMonths: startup.targetRunwayMonths || 12,
        createdAt: startup.createdAt,
        updatedAt: startup.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get startup by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup',
    });
  }
};

const updateStartup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID',
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    // Ownership check: only the founder can update
    if (startup.founder.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the founder of this startup',
      });
    }

    const { name, tagline, problemStatement, solution, industry, stage, description } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Startup name cannot be empty',
        });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Startup name cannot exceed 100 characters',
        });
      }
      startup.name = name.trim();
    }

    if (tagline !== undefined) {
      if (typeof tagline !== 'string' || !tagline.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Tagline cannot be empty',
        });
      }
      if (tagline.trim().length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Tagline cannot exceed 200 characters',
        });
      }
      startup.tagline = tagline.trim();
    }

    if (problemStatement !== undefined) {
      if (typeof problemStatement !== 'string' || !problemStatement.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Problem statement cannot be empty',
        });
      }
      startup.problemStatement = problemStatement.trim();
    }

    if (solution !== undefined) {
      if (typeof solution !== 'string' || !solution.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Solution cannot be empty',
        });
      }
      startup.solution = solution.trim();
    }

    if (industry !== undefined) {
      if (typeof industry !== 'string' || !industry.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Industry cannot be empty',
        });
      }
      startup.industry = industry.trim();
    }

    if (stage !== undefined) {
      if (!ALLOWED_STAGES.includes(stage)) {
        return res.status(400).json({
          success: false,
          message: 'Stage must be IDEA, MVP, EARLY_TRACTION, or GROWTH',
        });
      }
      startup.stage = stage;
    }

    if (description !== undefined) {
      startup.description = typeof description === 'string' ? description.trim() : '';
    }

    await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Startup updated successfully',
      startup: {
        id: startup._id.toString(),
        name: startup.name,
        tagline: startup.tagline,
        problemStatement: startup.problemStatement,
        solution: startup.solution,
        industry: startup.industry,
        stage: startup.stage,
        description: startup.description,
        founder: startup.founder.toString(),
        createdAt: startup.createdAt,
        updatedAt: startup.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update startup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating startup',
    });
  }
};

const deleteStartup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID',
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    // Ownership check: only the founder can delete
    if (startup.founder.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the founder of this startup',
      });
    }

    // Cascade delete any associated join requests and team memberships
    await JoinRequest.deleteMany({ startup: startup._id });
    await TeamMembership.deleteMany({ startup: startup._id });

    await startup.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Startup deleted successfully',
    });
  } catch (error) {
    console.error('Delete startup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting startup',
    });
  }
};

const getAllStartups = async (req, res) => {
  try {
    const startups = await Startup.find()
      .populate('founder', 'name email role')
      .sort({ createdAt: -1 });

    const formattedStartups = startups.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      tagline: s.tagline,
      problemStatement: s.problemStatement,
      solution: s.solution,
      industry: s.industry,
      stage: s.stage,
      description: s.description,
      founder: s.founder && typeof s.founder === 'object' && s.founder._id
        ? {
            id: s.founder._id.toString(),
            name: s.founder.name,
            role: s.founder.role,
          }
        : s.founder ? s.founder.toString() : null,
      initialCapital: s.initialCapital || 0,
      fundingRequired: s.fundingRequired || 0,
      fundingReceived: s.fundingReceived || 0,
      targetRunwayMonths: s.targetRunwayMonths || 12,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      startups: formattedStartups,
    });
  } catch (error) {
    console.error('Get all startups error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startups',
    });
  }
};

module.exports = {
  createStartup,
  getMyStartups,
  getStartupById,
  updateStartup,
  deleteStartup,
  getAllStartups,
};
