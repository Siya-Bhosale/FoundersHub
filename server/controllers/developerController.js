const mongoose = require('mongoose');
const DeveloperProfile = require('../models/DeveloperProfile');
const TeamMembership = require('../models/TeamMembership');
const Startup = require('../models/Startup');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const JoinRequest = require('../models/JoinRequest');
const { calculateExecutionScore } = require('../services/executionScoreService');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer storage for resumes
const RESUME_UPLOAD_DIR = path.join(__dirname, '../uploads/resumes');
if (!fs.existsSync(RESUME_UPLOAD_DIR)) {
  fs.mkdirSync(RESUME_UPLOAD_DIR, { recursive: true });
}

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RESUME_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = (req.user?.userId || req.user?.id || 'dev').toString();
    const uniqueSuffix = `${userId}_${Date.now()}${ext}`;
    cb(null, uniqueSuffix);
  },
});

const uploadResumeMiddleware = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, or DOCX files are allowed for resume upload.'));
    }
  },
}).single('resume');

const ALLOWED_AVAILABILITIES = ['AVAILABLE', 'PART_TIME', 'NOT_AVAILABLE'];

const isValidUrl = (val) => {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (e) {
    return false;
  }
};

const formatProfile = (p) => {
  const userData =
    p.user && typeof p.user === 'object' && p.user._id
      ? {
          id: p.user._id.toString(),
          _id: p.user._id.toString(),
          name: p.user.name,
          email: p.user.email,
          role: p.user.role,
        }
      : null;

  return {
    id: p._id.toString(),
    _id: p._id.toString(),
    user: userData,
    bio: p.bio || '',
    skills: Array.isArray(p.skills) ? p.skills : [],
    experience: p.experience || '',
    education: p.education || '',
    github: p.github || '',
    linkedin: p.linkedin || '',
    portfolio: p.portfolio || '',
    twitter: p.twitter || '',
    otherSocial: p.otherSocial || '',
    resumeUrl: p.resumeUrl || '',
    resumeFileName: p.resumeFileName || '',
    resumeOriginalName: p.resumeOriginalName || '',
    resumeUploadedAt: p.resumeUploadedAt || null,
    availability: p.availability || 'AVAILABLE',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

/**
 * POST /api/developers/profile
 * Create the authenticated developer's profile
 */
const createProfile = async (req, res) => {
  try {
    const existing = await DeveloperProfile.findOne({ user: req.user.userId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Developer profile already exists',
      });
    }

    const { bio, skills, experience, education, github, linkedin, portfolio, twitter, otherSocial, availability } = req.body;

    // Validation
    if (bio && (typeof bio !== 'string' || bio.length > 1000)) {
      return res.status(400).json({
        success: false,
        message: 'Bio cannot exceed 1000 characters',
      });
    }

    if (experience && (typeof experience !== 'string' || experience.length > 500)) {
      return res.status(400).json({
        success: false,
        message: 'Experience description cannot exceed 500 characters',
      });
    }

    if (education && (typeof education !== 'string' || education.length > 300)) {
      return res.status(400).json({
        success: false,
        message: 'Education description cannot exceed 300 characters',
      });
    }

    if (github && !isValidUrl(github)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GitHub URL. Must include http:// or https://',
      });
    }

    if (linkedin && !isValidUrl(linkedin)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid LinkedIn URL. Must include http:// or https://',
      });
    }

    if (portfolio && !isValidUrl(portfolio)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Portfolio URL. Must include http:// or https://',
      });
    }

    if (twitter && !isValidUrl(twitter)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Twitter/X URL. Must include http:// or https://',
      });
    }

    if (otherSocial && !isValidUrl(otherSocial)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Other Social URL. Must include http:// or https://',
      });
    }

    let sanitizedSkills = [];
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({
          success: false,
          message: 'Skills must be an array of strings',
        });
      }
      if (skills.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Skills list cannot exceed 50 items',
        });
      }
      sanitizedSkills = skills
        .filter((s) => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 50));
    }

    const selectedAvailability = availability || 'AVAILABLE';
    if (!ALLOWED_AVAILABILITIES.includes(selectedAvailability)) {
      return res.status(400).json({
        success: false,
        message: 'Availability must be AVAILABLE, PART_TIME, or NOT_AVAILABLE',
      });
    }

    const profile = await DeveloperProfile.create({
      user: req.user.userId,
      bio: bio ? bio.trim() : '',
      skills: sanitizedSkills,
      experience: experience ? experience.trim() : '',
      education: education ? education.trim() : '',
      github: github ? github.trim() : '',
      linkedin: linkedin ? linkedin.trim() : '',
      portfolio: portfolio ? portfolio.trim() : '',
      twitter: twitter ? twitter.trim() : '',
      otherSocial: otherSocial ? otherSocial.trim() : '',
      availability: selectedAvailability,
    });

    await profile.populate('user', 'name email role');

    return res.status(201).json({
      success: true,
      message: 'Developer profile created successfully',
      data: formatProfile(profile),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Developer profile already exists',
      });
    }
    console.error('Create developer profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating developer profile',
    });
  }
};

/**
 * GET /api/developers/profile
 * Get authenticated developer's own profile
 */
const getMyProfile = async (req, res) => {
  try {
    const profile = await DeveloperProfile.findOne({ user: req.user.userId }).populate(
      'user',
      'name email role'
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Developer profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: formatProfile(profile),
    });
  } catch (error) {
    console.error('Get developer profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching developer profile',
    });
  }
};

/**
 * PUT /api/developers/profile
 * Update authenticated developer's own profile
 */
const updateMyProfile = async (req, res) => {
  try {
    const profile = await DeveloperProfile.findOne({ user: req.user.userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Developer profile not found',
      });
    }

    const { bio, skills, experience, education, github, linkedin, portfolio, twitter, otherSocial, availability } = req.body;

    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 1000 characters',
        });
      }
      profile.bio = bio.trim();
    }

    if (experience !== undefined) {
      if (typeof experience !== 'string' || experience.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Experience description cannot exceed 500 characters',
        });
      }
      profile.experience = experience.trim();
    }

    if (education !== undefined) {
      if (typeof education !== 'string' || education.length > 300) {
        return res.status(400).json({
          success: false,
          message: 'Education description cannot exceed 300 characters',
        });
      }
      profile.education = education.trim();
    }

    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({
          success: false,
          message: 'Skills must be an array of strings',
        });
      }
      if (skills.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Skills list cannot exceed 50 items',
        });
      }
      profile.skills = skills
        .filter((s) => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 50));
    }

    if (availability !== undefined) {
      if (!ALLOWED_AVAILABILITIES.includes(availability)) {
        return res.status(400).json({
          success: false,
          message: 'Availability must be AVAILABLE, PART_TIME, or NOT_AVAILABLE',
        });
      }
      profile.availability = availability;
    }

    if (github !== undefined) {
      if (github && !isValidUrl(github)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GitHub URL. Must include http:// or https://',
        });
      }
      profile.github = typeof github === 'string' ? github.trim() : '';
    }

    if (linkedin !== undefined) {
      if (linkedin && !isValidUrl(linkedin)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid LinkedIn URL. Must include http:// or https://',
        });
      }
      profile.linkedin = typeof linkedin === 'string' ? linkedin.trim() : '';
    }

    if (portfolio !== undefined) {
      if (portfolio && !isValidUrl(portfolio)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Portfolio URL. Must include http:// or https://',
        });
      }
      profile.portfolio = typeof portfolio === 'string' ? portfolio.trim() : '';
    }

    if (twitter !== undefined) {
      if (twitter && !isValidUrl(twitter)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Twitter/X URL. Must include http:// or https://',
        });
      }
      profile.twitter = typeof twitter === 'string' ? twitter.trim() : '';
    }

    if (otherSocial !== undefined) {
      if (otherSocial && !isValidUrl(otherSocial)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Other Social URL. Must include http:// or https://',
        });
      }
      profile.otherSocial = typeof otherSocial === 'string' ? otherSocial.trim() : '';
    }

    await profile.save();
    await profile.populate('user', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Developer profile updated successfully',
      data: formatProfile(profile),
    });
  } catch (error) {
    console.error('Update developer profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating developer profile',
    });
  }
};

/**
 * DELETE /api/developers/profile
 * Delete authenticated developer's own profile
 */
const deleteMyProfile = async (req, res) => {
  try {
    const deleted = await DeveloperProfile.findOneAndDelete({ user: req.user.userId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Developer profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Developer profile deleted successfully',
    });
  } catch (error) {
    console.error('Delete developer profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting developer profile',
    });
  }
};

/**
 * GET /api/developers/:id
 * Get a developer's public profile by Profile ID or User ID
 */
const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid developer ID',
      });
    }

    let profile = await DeveloperProfile.findById(id).populate('user', 'name email role');
    if (!profile) {
      profile = await DeveloperProfile.findOne({ user: id }).populate('user', 'name email role');
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Developer profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: formatProfile(profile),
    });
  } catch (error) {
    console.error('Get public developer profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching developer profile',
    });
  }
};

/**
 * GET /api/developers/my-startups
 * Authenticated DEVELOPER retrieves all startups where they are an ACTIVE member.
 */
const getMyStartups = async (req, res) => {
  try {
    const userId = (req.user?.userId || req.user?.id)?.toString();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Query active team memberships for this developer
    const memberships = await TeamMembership.find({
      user: userId,
      status: 'ACTIVE',
    }).populate({
      path: 'startup',
      select: 'name tagline industry stage description problemStatement solution',
    });

    // Filter memberships where startup exists and is valid
    const validMemberships = memberships.filter((m) => m.startup && m.startup._id);
    const startupIds = validMemberships.map((m) => m.startup._id);

    // Get team counts for each startup (count of active members + 1 founder)
    const teamCounts = await TeamMembership.aggregate([
      {
        $match: {
          startup: { $in: startupIds },
          status: 'ACTIVE',
        },
      },
      {
        $group: {
          _id: '$startup',
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    teamCounts.forEach((tc) => {
      countMap[tc._id.toString()] = tc.count + 1; // + 1 for the founder
    });

    const formattedStartups = validMemberships.map((m) => {
      const s = m.startup;
      const sId = s._id.toString();
      return {
        id: sId,
        _id: sId,
        name: s.name,
        tagline: s.tagline || '',
        industry: s.industry || 'Technology',
        stage: s.stage || 'MVP',
        description: s.description || '',
        teamSize: countMap[sId] || 2,
        role: m.role || 'DEVELOPER',
        joinedAt: m.joinedAt,
      };
    });

    return res.status(200).json({
      success: true,
      startups: formattedStartups,
    });
  } catch (error) {
    console.error('Get developer startups error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching developer startups',
    });
  }
};

/**
 * GET /api/developers/startups/:startupId
 * Authenticated DEVELOPER views the overview summary for a specific startup workspace.
 * Requires ACTIVE TeamMembership for this startup.
 */
const getDeveloperStartupWorkspace = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = (req.user?.userId || req.user?.id)?.toString();

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid startup ID is required',
      });
    }

    const startup = await Startup.findById(startupId).populate('founder', 'name email');
    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    // Verify developer is an active member
    const membership = await TeamMembership.findOne({
      startup: startupId,
      user: userId,
      status: 'ACTIVE',
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not an active team member of this startup',
      });
    }

    // Query tasks assigned to this developer
    const myTasks = await Task.find({
      startup: startupId,
      assignedTo: userId,
    }).sort({ createdAt: -1 });

    const totalAssigned = myTasks.length;
    const completed = myTasks.filter((t) => t.status === 'DONE').length;
    const inProgress = myTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const blocked = myTasks.filter((t) => t.status === 'BLOCKED').length;
    const now = new Date();
    const overdue = myTasks.filter(
      (t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now
    ).length;

    // Execution Score
    let execution = { score: 50, grade: 'NEEDS_ATTENTION' };
    try {
      const execScore = await calculateExecutionScore(startupId);
      if (execScore) {
        execution = {
          score: execScore.score,
          grade: execScore.grade,
        };
      }
    } catch (e) {
      // Quiet default
    }

    // Active Sprint
    const activeSprint = await Sprint.findOne({
      startup: startupId,
      status: { $in: ['IN_PROGRESS', 'ACTIVE', 'APPROVED'] },
    });

    // Team Count
    const activeMembersCount = await TeamMembership.countDocuments({
      startup: startupId,
      status: 'ACTIVE',
    });
    const teamSize = activeMembersCount + 1; // +1 for founder

    return res.status(200).json({
      success: true,
      startup: {
        id: startup._id.toString(),
        _id: startup._id.toString(),
        name: startup.name,
        tagline: startup.tagline || '',
        industry: startup.industry || '',
        stage: startup.stage || '',
        description: startup.description || '',
        problemStatement: startup.problemStatement || '',
        solution: startup.solution || '',
        founder: startup.founder ? { name: startup.founder.name } : null,
      },
      developer: {
        role: membership.role || 'DEVELOPER',
        joinedAt: membership.joinedAt,
      },
      tasksSummary: {
        total: totalAssigned,
        completed,
        inProgress,
        blocked,
        overdue,
      },
      execution,
      sprint: activeSprint
        ? {
            id: activeSprint._id.toString(),
            name: activeSprint.name,
            goal: activeSprint.goal,
            status: activeSprint.status,
            durationDays: activeSprint.durationDays || 14,
            progress: activeSprint.progress || 0,
          }
        : {
            name: 'No active sprint',
            goal: 'Deliver core startup features',
            status: 'NONE',
            durationDays: 14,
            progress: 0,
          },
      team: {
        size: teamSize,
      },
    });
  } catch (error) {
    console.error('Get developer startup workspace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup workspace',
    });
  }
};

/**
 * Helper to generate deterministic developer fallback guidance grounded in real startup and task data.
 * Guarantees distinct, non-repetitive, actionable answers for all 10 core question types.
 */
const getDeveloperFallbackGuidance = ({
  startup,
  sprint,
  myTasks = [],
  allTasks = [],
  execution = { score: 50, grade: 'NEEDS_ATTENTION' },
  riskAnalysis = null,
  developer = { name: 'Developer', role: 'DEVELOPER', skills: [] },
  message = '',
}) => {
  const query = (message || '').trim();
  const lower = query.toLowerCase();

  const now = new Date();
  const assignedCount = myTasks.length;
  const blockedTasks = myTasks.filter((t) => t.status === 'BLOCKED');
  const overdueTasks = myTasks.filter((t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now);
  const inProgressTasks = myTasks.filter((t) => t.status === 'IN_PROGRESS');
  const todoTasks = myTasks.filter((t) => t.status === 'TODO');
  const completedTasks = myTasks.filter((t) => t.status === 'DONE');
  const highCriticalTasks = myTasks.filter((t) => t.priority === 'CRITICAL' || t.priority === 'HIGH');
  const teamBlocked = allTasks.filter((t) => t.status === 'BLOCKED');
  const teamOverdue = allTasks.filter((t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now);

  let answer = '';
  let actions = [];
  let references = [];

  // 1. OVERDUE TASKS INQUIRY: "Do I have any overdue tasks?"
  if (
    lower.includes('overdue') ||
    lower.includes('past due') ||
    lower.includes('deadline missed') ||
    lower.includes('late task') ||
    lower.includes('missed deadline')
  ) {
    if (overdueTasks.length > 0) {
      const overdueListStr = overdueTasks
        .map((t) => `"${t.title}" (Priority: ${t.priority || 'MEDIUM'}, Due: ${t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'Past Due'})`)
        .join(', ');
      answer = `Yes, you currently have ${overdueTasks.length} overdue task(s): ${overdueListStr}. These overdue items directly reduce the startup's deadline adherence metric (${execution.components?.deadlineAdherence?.percentage ?? 0}%) and pull down ${startup.name}'s overall execution score (${execution.score}/100).`;
      actions = [
        `Prioritize completing "${overdueTasks[0].title}" before taking on new work`,
        'Notify the founder if unexpected technical blockers or dependencies caused the delay',
        'Update task status on the Kanban board immediately once implementation passes review',
      ];
      references = overdueTasks.map((t) => `Overdue Task: "${t.title}" (Due: ${new Date(t.dueDate).toISOString().split('T')[0]})`);
    } else {
      answer = `No, you have 0 overdue tasks! All ${assignedCount} of your assigned deliverables for ${startup.name} are either completed or within their target schedule, maintaining a strong deadline adherence score (${execution.components?.deadlineAdherence?.percentage ?? 100}%).`;
      actions = [
        'Continue monitoring upcoming deadlines on your active tasks',
        'Maintain your current development velocity to stay ahead of sprint milestones',
        'Help unblock team members if any of their deliverables are falling behind',
      ];
      references = ['0 overdue tasks', `Deadline Adherence: ${execution.components?.deadlineAdherence?.percentage ?? 100}%`];
    }
  }
  // 2. HIGHEST PRIORITY TASKS INQUIRY: "Which of my tasks are highest priority?"
  else if (
    lower.includes('highest priority') ||
    lower.includes('top priority') ||
    (lower.includes('which') && lower.includes('priorit')) ||
    (lower.includes('my tasks') && lower.includes('priorit'))
  ) {
    if (highCriticalTasks.length > 0) {
      const topTask = highCriticalTasks[0];
      const listStr = highCriticalTasks.map((t) => `"${t.title}" [${t.priority} • ${t.status}]`).join(', ');
      answer = `Your highest priority assigned tasks are: ${listStr}. Among these, "${topTask.title}" (${topTask.priority}) is the most critical item requiring focus because it directly advances ${startup.name}'s core MVP milestone.`;
      actions = [
        `Focus immediate implementation effort on "${topTask.title}"`,
        `Ensure "${topTask.title}" has clear technical specifications and testing criteria`,
        'Keep status updated on the Kanban board to give the team real-time visibility',
      ];
      references = highCriticalTasks.map((t) => `Task: "${t.title}" (${t.priority})`);
    } else if (assignedCount > 0) {
      const topTask = inProgressTasks[0] || todoTasks[0] || myTasks[0];
      answer = `You do not have any CRITICAL or HIGH priority tasks currently assigned. Your highest relative priority task is "${topTask.title}" (Priority: ${topTask.priority || 'MEDIUM'}, Status: ${topTask.status}).`;
      actions = [
        `Proceed with "${topTask.title}" as your primary deliverable`,
        'Check with the founder if any upcoming sprint backlog items require higher-priority attention',
        'Review task acceptance criteria before marking as DONE',
      ];
      references = [`Task: "${topTask.title}" (${topTask.priority || 'MEDIUM'})`];
    } else {
      answer = `You currently have no tasks assigned to you for ${startup.name}. Review the team Kanban board or coordinate with the founder to pick up high-priority items from the sprint backlog.`;
      actions = [
        'Browse the All Team Tasks view on the Kanban board',
        'Coordinate with the founder to get assigned to priority deliverables',
        'Review sprint objectives to identify where your skills can contribute',
      ];
      references = ['0 assigned tasks'];
    }
  }
  // 3. PERFORMANCE INQUIRY: "How am I performing?"
  else if (
    lower.includes('how am i performing') ||
    lower.includes('my performance') ||
    lower.includes('how is my work') ||
    lower.includes('evaluate my work')
  ) {
    const completionRate = assignedCount > 0 ? Math.round((completedTasks.length / assignedCount) * 100) : 0;
    answer = `You have completed ${completedTasks.length} of your ${assignedCount} assigned task(s) (${completionRate}% completion rate). You have ${inProgressTasks.length} in progress, ${blockedTasks.length} blocked, and ${overdueTasks.length} overdue. Your deliverables directly contribute to ${startup.name}'s overall execution score of ${execution.score}/100 (${execution.grade}). ${overdueTasks.length > 0 ? `Addressing your ${overdueTasks.length} overdue task(s) will further strengthen your performance impact.` : 'Maintaining this cadence ensures steady progress toward the sprint goal.'}`;
    actions = [
      inProgressTasks.length > 0 ? `Push "${inProgressTasks[0].title}" to completion` : 'Pick up the next sprint backlog task',
      blockedTasks.length > 0 ? `Resolve blocker on "${blockedTasks[0].title}"` : 'Ensure test coverage on completed deliverables',
      'Keep Kanban board card statuses updated in real time',
    ];
    references = [
      `Assigned Tasks: ${completedTasks.length}/${assignedCount} completed (${completionRate}%)`,
      `Execution Score: ${execution.score}/100 (${execution.grade})`,
      `Active Sprint: ${sprint.name}`,
    ];
  }
  // 4. BLOCKER INQUIRY: "What is blocking my progress?"
  else if (
    lower.includes('blocking') ||
    lower.includes('blocker') ||
    lower.includes('impediment') ||
    lower.includes('stuck')
  ) {
    if (blockedTasks.length > 0) {
      const bTask = blockedTasks[0];
      answer = `You have ${blockedTasks.length} blocked task(s): "${bTask.title}". This impediment is halting progress on this deliverable and negatively impacting sprint velocity.`;
      actions = [
        `Document the exact blocker reason or dependency on "${bTask.title}"`,
        'Flag the blocker immediately to the founder or peer developers in standup',
        'Pivot to an unblocked task while waiting for resolution',
      ];
      references = blockedTasks.map((t) => `Blocked Task: "${t.title}"`);
    } else if (teamBlocked.length > 0) {
      answer = `You personally have 0 blocked tasks. However, the wider team has ${teamBlocked.length} blocked task(s) across the sprint (e.g. "${teamBlocked[0].title}"). Helping clear these team-level blockers will improve overall velocity.`;
      actions = [
        `Review team blocked card: "${teamBlocked[0].title}"`,
        'Offer technical pairing or code review if within your skillset',
        'Ensure your own in-progress tasks remain unblocked',
      ];
      references = teamBlocked.map((t) => `Team Blocked Task: "${t.title}"`);
    } else {
      answer = `There are currently 0 blocked tasks across ${startup.name}'s entire sprint board! The execution pipeline is running cleanly without recorded impediments.`;
      actions = [
        'Maintain momentum on your active in-progress deliverables',
        'Add unit and integration tests to prevent regression blockers',
        'Proactively flag any emerging technical risks before they become blockers',
      ];
      references = ['0 blocked tasks in sprint'];
    }
  }
  // 5. BEFORE SPRINT ENDS INQUIRY: "What should I complete before the sprint ends?"
  else if (
    lower.includes('before the sprint ends') ||
    lower.includes('before sprint ends') ||
    lower.includes('complete before sprint') ||
    lower.includes('finish before sprint')
  ) {
    const incompleteTasks = myTasks.filter((t) => t.status !== 'DONE');
    if (incompleteTasks.length > 0) {
      const taskNames = incompleteTasks.map((t) => `"${t.title}" [${t.priority} • ${t.status}]`).join(', ');
      answer = `Before sprint "${sprint.name}" concludes, you have ${incompleteTasks.length} task(s) to complete: ${taskNames}. Delivering these items is necessary to fulfill ${startup.name}'s active sprint goal: "${sprint.goal}".`;
      actions = [
        `Prioritize finishing in-progress item "${(inProgressTasks[0] || incompleteTasks[0]).title}"`,
        'Conduct peer review or testing on completed features',
        'Ensure all acceptance criteria are met before moving cards to DONE',
      ];
      references = incompleteTasks.map((t) => `Task to Complete: "${t.title}" (${t.status})`).concat([`Sprint: ${sprint.name}`]);
    } else {
      answer = `You have already completed all your assigned tasks for "${sprint.name}"! With all your deliverables marked DONE, you have satisfied your sprint commitments.`;
      actions = [
        'Help teammates review pull requests or unblock pending tasks',
        'Refine documentation or automated test suites',
        'Coordinate with the founder to prepare backlog specifications for the next sprint',
      ];
      references = [`Sprint: ${sprint.name}`, 'All assigned tasks completed (100%)'];
    }
  }
  // 6. SPRINT SUMMARY INQUIRY: "Give me a summary of my current sprint."
  else if (
    lower.includes('summary of my current sprint') ||
    lower.includes('sprint summary') ||
    lower.includes('current sprint') ||
    lower.includes('about the sprint')
  ) {
    const sprintTasks = allTasks.length;
    const sprintDone = allTasks.filter((t) => t.status === 'DONE').length;
    const sprintProgress = sprintTasks > 0 ? Math.round((sprintDone / sprintTasks) * 100) : (sprint.progress || 0);
    answer = `Sprint "${sprint.name}" is currently ${sprint.status} for ${startup.name}. The primary sprint goal is: "${sprint.goal}". Across the entire team, ${sprintDone} of ${sprintTasks} tasks are completed (${sprintProgress}% progress). You have ${completedTasks.length} of ${assignedCount} assigned deliverables completed. The startup's execution score is ${execution.score}/100 (${execution.grade}).`;
    actions = [
      'Align all remaining work with the sprint goal',
      'Resolve in-progress and blocked tasks before the sprint review',
      'Ensure test coverage is validated for all completed sprint deliverables',
    ];
    references = [
      `Sprint: "${sprint.name}" (Status: ${sprint.status})`,
      `Goal: "${sprint.goal}"`,
      `Sprint Progress: ${sprintProgress}% (${sprintDone}/${sprintTasks} tasks)`,
      `Execution Score: ${execution.score}/100`,
    ];
  }
  // 7. FINISH TODAY INQUIRY: "Which task should I finish today?"
  else if (
    lower.includes('finish today') ||
    lower.includes('task today') ||
    lower.includes('work on today') ||
    lower.includes('complete today')
  ) {
    let todayTask = overdueTasks[0] || inProgressTasks[0] || highCriticalTasks.find((t) => t.status !== 'DONE') || todoTasks[0];
    if (todayTask) {
      const reason = overdueTasks.includes(todayTask)
        ? 'it is overdue and directly reducing your team execution score'
        : todayTask.status === 'IN_PROGRESS'
        ? 'it is already in progress and finishing open work prevents context switching'
        : `it is your highest priority task (${todayTask.priority || 'HIGH'}) for the sprint`;

      answer = `The single task you should focus on finishing today is "${todayTask.title}" (Priority: ${todayTask.priority || 'MEDIUM'}, Status: ${todayTask.status}). You should finish this today because ${reason}.`;
      actions = [
        `Dedicate focused engineering time to complete "${todayTask.title}"`,
        'Run tests locally to verify functionality before marking DONE',
        'Update the task card on the Kanban board to reflect completion',
      ];
      references = [`Target Task: "${todayTask.title}"`, `Priority: ${todayTask.priority || 'MEDIUM'}`, `Status: ${todayTask.status}`];
    } else if (assignedCount > 0 && completedTasks.length === assignedCount) {
      answer = `You have already completed all your assigned tasks for today! Great execution. You can check the backlog for unassigned tasks or help teammates unblock their items.`;
      actions = [
        'Review open pull requests from other team members',
        'Assist with any blocked team tasks on the Kanban board',
        'Coordinate with the founder for tomorrow\'s priority items',
      ];
      references = ['All assigned tasks DONE'];
    } else {
      answer = `You do not have any tasks currently assigned to you for today. Check the team Kanban board to pick up unassigned items from the sprint backlog.`;
      actions = [
        'View the Kanban board for unassigned tasks',
        'Reach out to the founder to take ownership of a backlog task',
        'Familiarize yourself with the sprint goal specifications',
      ];
      references = ['0 assigned tasks'];
    }
  }
  // 8. EXECUTION SCORE INQUIRY: "Why is my execution score low?"
  else if (
    lower.includes('execution score') ||
    lower.includes('score low') ||
    lower.includes('why is my execution score') ||
    lower.includes('why is the score')
  ) {
    const reasons = [];
    if (execution.metadata?.overdueTasks > 0 || overdueTasks.length > 0) {
      reasons.push(`${execution.metadata?.overdueTasks || overdueTasks.length} overdue task(s) penalizing deadline adherence`);
    }
    if (execution.metadata?.blockedTasks > 0 || blockedTasks.length > 0) {
      reasons.push(`${execution.metadata?.blockedTasks || blockedTasks.length} blocked task(s) hurting velocity and risk scores`);
    }
    const compPct = execution.components?.taskCompletion?.percentage ?? 0;
    if (compPct < 50) {
      reasons.push(`low overall task completion rate (${compPct}%)`);
    }
    if (reasons.length === 0) {
      reasons.push('sprint cadence and task volume still ramping up');
    }
    answer = `${startup.name}'s current execution score is ${execution.score}/100 (${execution.grade}). The primary factors lowering the score are: ${reasons.join('; ')}. Addressing these items directly will restore the score toward the target 80+ benchmark.`;
    actions = [
      overdueTasks.length > 0 ? `Immediately resolve overdue task "${overdueTasks[0].title}"` : 'Clear approaching task deadlines',
      blockedTasks.length > 0 ? `Unblock "${blockedTasks[0].title}" with team assistance` : 'Ensure active cards stay unblocked',
      'Move completed tasks to DONE on the Kanban board promptly',
    ];
    references = [
      `Execution Score: ${execution.score}/100 (${execution.grade})`,
      `Deadline Adherence: ${execution.components?.deadlineAdherence?.percentage ?? 0}%`,
      `Task Completion: ${execution.components?.taskCompletion?.percentage ?? 0}%`,
      `Blocked Tasks: ${execution.metadata?.blockedTasks ?? 0}`,
    ];
  }
  // 9. DISCUSS WITH FOUNDER INQUIRY: "What should I discuss with my founder?"
  else if (
    lower.includes('discuss with my founder') ||
    lower.includes('discuss with founder') ||
    lower.includes('talk to founder') ||
    lower.includes('sync with founder') ||
    lower.includes('meet with founder')
  ) {
    const agendaItems = [];
    if (blockedTasks.length > 0) {
      agendaItems.push(`Blocker Escalation: Request resolution or architectural clarification on "${blockedTasks[0].title}"`);
    } else {
      agendaItems.push('Blocker Status: Confirm zero active blockers in your workflow');
    }
    if (overdueTasks.length > 0) {
      agendaItems.push(`Deadline Re-estimation: Discuss timeline adjustments for overdue task "${overdueTasks[0].title}"`);
    } else {
      agendaItems.push('Milestone Velocity: Review on-time task delivery');
    }
    agendaItems.push(`Sprint Goal Progress: Review your deliverables against the sprint goal "${sprint.goal}" (${completedTasks.length}/${assignedCount} completed)`);
    agendaItems.push(`Capacity & Backlog: Confirm priorities for next sprint backlog items based on ${startup.name}'s roadmap`);

    answer = `Here is a recommended 4-point sync agenda to discuss with your founder: 1. ${agendaItems[0]}, 2. ${agendaItems[1]}, 3. ${agendaItems[2]}, 4. ${agendaItems[3]}. Preparing these specific points ensures a high-efficiency 15-minute alignment.`;
    actions = [
      'Share this 4-point agenda in a quick message to the founder before syncing',
      blockedTasks.length > 0 ? `Prepare details of what is blocking "${blockedTasks[0].title}"` : 'Summarize completed sprint deliverables',
      'Document agreed action items in task comments on the Kanban board',
    ];
    references = [
      `Startup: ${startup.name}`,
      `Sprint Goal: "${sprint.goal}"`,
      blockedTasks.length > 0 ? `Blocked: "${blockedTasks[0].title}"` : '0 personal blockers',
      `Assigned: ${completedTasks.length}/${assignedCount} completed`,
    ];
  }
  // 10. WHAT TO WORK ON NEXT INQUIRY: "What should I work on next?"
  // Evaluation hierarchy: Blocked task -> Overdue task -> High/Critical priority task -> Nearest due date -> In Progress task -> Next TODO -> No tasks
  else if (
    lower.includes('work on next') ||
    lower.includes('what should i work on') ||
    lower.includes('what should i do next') ||
    lower.includes('what next') ||
    lower.includes('next task') ||
    (lower.includes('next') && !lower.includes('sprint'))
  ) {
    if (blockedTasks.length > 0) {
      const b = blockedTasks[0];
      answer = `Your most urgent focus is resolving your blocked task: "${b.title}". Because this task is marked BLOCKED, addressing the dependency or escalating the hurdle to your founder is your top priority before taking on new items.`;
      actions = [
        `Document the blocker details on "${b.title}"`,
        'Reach out to the founder or peer developers for resolution',
        inProgressTasks[0] ? `Meanwhile, work on "${inProgressTasks[0].title}"` : 'Review the sprint backlog',
      ];
      references = [`Blocked Task: "${b.title}"`];
    } else if (overdueTasks.length > 0) {
      const o = overdueTasks[0];
      answer = `You should work on your overdue task: "${o.title}" (Due: ${new Date(o.dueDate).toISOString().split('T')[0]}). Clearing this overdue deliverable is your highest immediate priority to recover sprint velocity and protect ${startup.name}'s execution score (${execution.score}/100).`;
      actions = [
        `Complete implementation of "${o.title}"`,
        'Run tests to verify acceptance criteria',
        'Mark as DONE on the Kanban board',
      ];
      references = [`Overdue Task: "${o.title}" (Due: ${new Date(o.dueDate).toISOString().split('T')[0]})`];
    } else if (highCriticalTasks.find((t) => t.status !== 'DONE')) {
      const h = highCriticalTasks.find((t) => t.status !== 'DONE');
      answer = `You should work on your high-priority deliverable: "${h.title}" (Priority: ${h.priority}, Status: ${h.status}). Delivering this item directly advances ${startup.name}'s sprint goal: "${sprint.goal}".`;
      actions = [
        h.status === 'TODO' ? `Move "${h.title}" to IN PROGRESS on the Kanban board` : `Finish implementation on "${h.title}"`,
        'Review technical requirements',
        'Sync with team if any architecture questions arise',
      ];
      references = [`Task: "${h.title}" (${h.priority})`];
    } else if (inProgressTasks.length > 0) {
      const ip = inProgressTasks[0];
      answer = `You should continue working on your in-progress task: "${ip.title}". Finishing work you have already started maintains sprint flow and avoids context-switching overhead.`;
      actions = [
        `Complete active coding on "${ip.title}"`,
        'Verify unit tests and open a pull request',
        todoTasks[0] ? `Queue next task: "${todoTasks[0].title}"` : 'Check sprint backlog for next assignment',
      ];
      references = [`Task: "${ip.title}" (IN_PROGRESS)`];
    } else if (todoTasks.length > 0) {
      const sortedTodos = [...todoTasks].sort((a, b) => {
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
      const nextTodo = sortedTodos[0];
      answer = `You should pick up "${nextTodo.title}" from your backlog${nextTodo.dueDate ? ` (Due: ${new Date(nextTodo.dueDate).toISOString().split('T')[0]})` : ''}. Moving this to IN PROGRESS will advance ${startup.name}'s sprint progress.`;
      actions = [
        `Move "${nextTodo.title}" to IN PROGRESS on the Kanban board`,
        'Break down implementation into modular components',
        'Verify acceptance criteria with the sprint goal',
      ];
      references = [`Task: "${nextTodo.title}" (TODO)`];
    } else if (assignedCount === 0) {
      answer = `You currently have no assigned tasks for ${startup.name}. Review the team Kanban board or coordinate with the founder to pick up unassigned items from the sprint backlog.`;
      actions = [
        'Browse the "All Team Tasks" view on the Kanban board',
        'Request task assignment from the founder',
        'Review the startup problem statement and sprint objectives',
      ];
      references = ['0 assigned tasks in sprint'];
    } else {
      answer = `All your assigned tasks for ${startup.name} are currently completed! Great job maintaining sprint execution.`;
      actions = [
        'Check with team members if any blocked items need support',
        'Review code reviews or pull requests',
        'Help prepare items for the next sprint milestone',
      ];
      references = ['All assigned tasks completed (DONE)'];
    }
  }
  // 11. GENERAL / TECHNICAL / CUSTOM INQUIRY: Dynamically synthesize response tailored to user's question
  else {
    const topTask = inProgressTasks[0] || highCriticalTasks[0] || todoTasks[0] || myTasks[0];
    const taskContext = topTask
      ? `Your current active deliverable is "${topTask.title}" (${topTask.status} • Priority: ${topTask.priority || 'MEDIUM'})`
      : 'You currently have no tasks assigned in this sprint';

    // Topic-specific dynamic synthesis
    if (lower.includes('test') || lower.includes('qa') || lower.includes('unit') || lower.includes('coverage') || lower.includes('jest') || lower.includes('mocha')) {
      answer = `To maintain high code quality for ${startup.name}, structure your test suite using the Arrange-Act-Assert pattern. Focus unit tests on core business logic and edge cases in active deliverables like "${topTask?.title || 'core features'}". Keep mocks minimal and favor integration tests for API boundary verification.`;
      actions = [
        topTask ? `Add unit and integration tests for "${topTask.title}"` : 'Identify untested critical paths in the codebase',
        'Target at least 80% test coverage for authentication and transaction modules',
        'Set up automated test runs in your CI pipeline before merging PRs',
      ];
      references = [
        `Startup: ${startup.name}`,
        topTask ? `Active Task: "${topTask.title}"` : 'Unit Testing Guidelines',
        `Sprint: ${sprint.name}`,
      ];
    } else if (lower.includes('database') || lower.includes('schema') || lower.includes('mongo') || lower.includes('sql') || lower.includes('query') || lower.includes('index')) {
      answer = `For ${startup.name}'s data layer, optimize query patterns by indexing heavily filtered fields and establishing clear data normalization boundaries. When working on "${topTask?.title || 'database tasks'}", ensure compound indexes support your frequent sorting keys to avoid collection scans.`;
      actions = [
        'Review slow queries and apply compound indexes on frequent filter fields',
        'Ensure Mongoose/database schemas have strict validation and timestamps enabled',
        'Implement database connection pooling and graceful error handling',
      ];
      references = [
        `Startup: ${startup.name}`,
        topTask ? `Task: "${topTask.title}"` : 'Database Architecture',
        'MongoDB / Database Health',
      ];
    } else if (lower.includes('auth') || lower.includes('jwt') || lower.includes('security') || lower.includes('token') || lower.includes('password') || lower.includes('permission')) {
      answer = `Security and authentication are critical for ${startup.name}'s platform trust. Ensure JWT secrets are securely managed in environment variables, tokens are verified via middleware with strict role-based checks, and passwords use bcrypt with salt rounds of 10+.`;
      actions = [
        'Verify role-based access middleware covers all privileged API endpoints',
        'Enforce token expiry and store refresh tokens securely',
        'Audit API error messages to ensure sensitive stack traces are not leaked',
      ];
      references = [
        `Startup: ${startup.name}`,
        'Security Best Practices',
        topTask ? `Task: "${topTask.title}"` : 'Auth Module',
      ];
    } else if (lower.includes('deploy') || lower.includes('docker') || lower.includes('ci/cd') || lower.includes('cloud') || lower.includes('aws') || lower.includes('vercel') || lower.includes('render')) {
      answer = `For smooth deployment of ${startup.name}, automate build and lint steps in GitHub Actions before deploying to production. Ensure all environment variables are isolated, database connection strings are encrypted, and health-check endpoints are monitored.`;
      actions = [
        'Validate health-check endpoint (/api/health) returns 200 with DB status',
        'Configure automated build checks on all pull requests',
        'Set up staging environments to test sprint deliverables before founder sign-off',
      ];
      references = [
        `Startup: ${startup.name}`,
        'Deployment Pipeline',
        `Active Sprint: ${sprint.name}`,
      ];
    } else if (lower.includes('frontend') || lower.includes('ui') || lower.includes('ux') || lower.includes('react') || lower.includes('tailwind') || lower.includes('css') || lower.includes('component')) {
      answer = `For ${startup.name}'s user interface, prioritize responsive design, fast page loads, and clear feedback states (loading spinners, empty states, error toasts). If you are implementing UI for "${topTask?.title || 'frontend tasks'}", adhere to the design system's color tokens and reusable component structure.`;
      actions = [
        'Ensure loading, error, and empty states are gracefully handled across all views',
        'Keep components modular and extract repeated logic into custom hooks',
        'Test UI responsiveness on mobile and tablet viewport widths',
      ];
      references = [
        `Startup: ${startup.name}`,
        topTask ? `Task: "${topTask.title}"` : 'Frontend Design System',
        'UI/UX Standards',
      ];
    } else if (lower.includes('api') || lower.includes('endpoint') || lower.includes('rest') || lower.includes('backend') || lower.includes('controller') || lower.includes('route')) {
      answer = `For backend API development on ${startup.name}, design consistent RESTful endpoints with standard status codes, input validation (sanitize query & body), and centralized error handling. When delivering "${topTask?.title || 'API endpoints'}", verify response payload schemas match frontend expectations.`;
      actions = [
        'Validate all incoming request params and body payloads before controller execution',
        'Use standard HTTP status codes (200, 201, 400, 401, 403, 404, 500)',
        'Document API contract specifications or provide Postman/cURL test cases',
      ];
      references = [
        `Startup: ${startup.name}`,
        topTask ? `Task: "${topTask.title}"` : 'API Architecture',
        `Sprint: ${sprint.name}`,
      ];
    } else {
      // Dynamic synthesis using user's exact query
      const sanitizedQuery = query.replace(/[^\w\s?]/gi, '').trim();
      answer = `Regarding "${sanitizedQuery}": In the context of ${startup.name} (${startup.stage}), your technical effort should align with sprint "${sprint.name}" and goal: "${sprint.goal}". ${taskContext}. Your team execution score is currently ${execution.score}/100 (${execution.grade}), so keeping deliverables focused and on schedule will maximize your impact.`;
      actions = [
        topTask ? `Advance implementation on active deliverable "${topTask.title}"` : 'Check the Kanban board for unassigned sprint backlog items',
        'Coordinate with team members or founder if you need architectural clarification',
        'Keep task statuses updated on the Kanban board to maintain execution transparency',
      ];
      references = [
        `Startup: ${startup.name} (${startup.stage})`,
        `Sprint: ${sprint.name}`,
        topTask ? `Task: "${topTask.title}"` : '0 assigned tasks',
        `Execution Score: ${execution.score}/100`,
      ];
    }
  }

  return { answer, actions, references, source: 'fallback' };
};

/**
 * Shared core engine to generate Developer AI Mentor response using real MongoDB data and Gemini.
 */
const generateDeveloperAIMentorResponse = async (startupId, userId, message, history = []) => {
  const startup = await Startup.findById(startupId);
  if (!startup) {
    throw new Error('Startup not found');
  }

  // Fetch developer user details and profile
  const devUser = await User.findById(userId).select('name email role');
  const devProfile = await DeveloperProfile.findOne({ user: userId });
  const developer = {
    name: devUser?.name || 'Developer',
    role: devUser?.role || 'DEVELOPER',
    skills: devProfile?.skills || [],
  };

  // Fetch active team members
  const teamMemberships = await TeamMembership.find({
    startup: startupId,
    status: 'ACTIVE',
  }).populate('user', 'name email role');

  const teamMembers = teamMemberships.map((m) => ({
    name: m.user?.name || 'Team Member',
    role: m.role || 'DEVELOPER',
  }));

  // Fetch all startup tasks & assigned tasks
  const allTasks = await Task.find({ startup: startupId });
  const myTasks = allTasks.filter((t) => t.assignedTo && t.assignedTo.toString() === userId.toString());

  // Fetch active sprint
  const activeSprint = await Sprint.findOne({
    startup: startupId,
    status: { $in: ['IN_PROGRESS', 'ACTIVE', 'APPROVED'] },
  }).sort({ createdAt: -1 });

  const sprint = {
    name: activeSprint?.name || 'Current Sprint',
    goal: activeSprint?.goal || 'Build and validate key MVP capabilities',
    status: activeSprint?.status || 'ACTIVE',
    progress: activeSprint?.progress || 0,
    startDate: activeSprint?.startDate ? new Date(activeSprint.startDate).toISOString().split('T')[0] : 'N/A',
    endDate: activeSprint?.endDate ? new Date(activeSprint.endDate).toISOString().split('T')[0] : 'N/A',
  };

  // Calculate execution score
  let execution = { score: 50, grade: 'NEEDS_ATTENTION' };
  try {
    const exec = await calculateExecutionScore(startupId);
    if (exec) {
      execution = exec;
    }
  } catch (e) {
    console.warn('[DeveloperAIMentor] Error calculating execution score:', e.message);
  }

  const riskAnalysis = startup.executionRiskAnalysis || {
    overallRisk: 'MODERATE',
    summary: 'Execution cadence progressing through early sprints',
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return getDeveloperFallbackGuidance({
      startup,
      sprint,
      myTasks,
      allTasks,
      execution,
      riskAnalysis,
      developer,
      message,
    });
  }

  // Format context for dynamic Gemini prompt
  const assignedTasksText =
    myTasks.length > 0
      ? myTasks
          .map(
            (t) =>
              `- [${t.status}] "${t.title}" (Priority: ${t.priority || 'MEDIUM'}, Due: ${
                t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'None'
              }, Est: ${t.estimatedHours || 0}h, Day: ${t.day || 'N/A'}${t.description ? ` - ${t.description}` : ''})`
          )
          .join('\n')
      : '- No tasks assigned yet';

  const teamMembersText =
    teamMembers.length > 0
      ? teamMembers.map((m) => `- ${m.name} (${m.role})`).join('\n')
      : '- Solo developer';

  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
  const historyText =
    recentHistory.length > 0
      ? recentHistory
          .map((h) => `${h.role === 'user' ? 'Developer' : 'Mentor'}: ${h.content || h.text || ''}`)
          .join('\n')
      : '';

  const prompt = `SYSTEM:
You are the AI Developer Mentor inside SprintFounders for "${startup.name}" (${startup.industry} • ${startup.stage}).
Your job is to give accurate, practical, startup-specific guidance.

You MUST answer the developer's CURRENT QUESTION:
"${message.trim()}"

Never return a generic startup-management answer.
Use ONLY the provided startup context.

If the required information is not available, explicitly say:
"I don't have enough information to answer that accurately."

Never invent:
- tasks
- deadlines
- team members
- startup metrics
- funding
- progress
- technologies
- requirements
- business facts

CURRENT USER:
Developer: ${developer.name}
Developer role: ${developer.role}
Developer skills: ${developer.skills.join(', ') || 'Software Development'}

QUESTION:
${message.trim()}

STARTUP CONTEXT:
- Name: ${startup.name}
- Industry: ${startup.industry}
- Stage: ${startup.stage}
- Tagline: ${startup.tagline || 'N/A'}
- Problem: ${startup.problemStatement}
- Solution: ${startup.solution}
- Description: ${startup.description || 'N/A'}

TEAM:
Active Team Members:
${teamMembersText}

CURRENT SPRINT:
- Name: ${sprint.name}
- Goal: ${sprint.goal}
- Status: ${sprint.status}
- Progress: ${sprint.progress}%
- Start Date: ${sprint.startDate}
- End Date: ${sprint.endDate}

MY ASSIGNED TASKS:
${assignedTasksText}

EXECUTION DATA:
- Execution Score: ${execution.score}/100 (${execution.grade})
- Task Completion: ${execution.components?.taskCompletion?.percentage ?? 0}%
- Deadline Adherence: ${execution.components?.deadlineAdherence?.percentage ?? 0}%
- Blocked Tasks: ${execution.metadata?.blockedTasks ?? 0}
- Overdue Tasks: ${execution.metadata?.overdueTasks ?? 0}

AI RISK:
- Overall Risk: ${riskAnalysis.overallRisk || 'MODERATE'}
- Risk Summary: ${riskAnalysis.summary || 'Standard development cadence'}

${historyText ? `RECENT CONVERSATION HISTORY:\n${historyText}\n` : ''}

INSTRUCTIONS:
1. Directly answer the current question with a unique, insightful, and customized response.
2. Prioritize the developer's actual assigned work and real active tasks.
3. Reference real task names, sprint goals, and actual deadlines when relevant.
4. If recommending a task, explain the technical and operational why.
5. NEVER repeat generic canned introductions or identical phrasing across questions.
6. Provide practical, high-value engineering guidance tailored specifically to what the user asked.
7. If the question is ambiguous, ask a concise clarification.
8. If there is no relevant data, say so instead of hallucinating.
9. Keep the answer practical, distinct, and actionable.
10. Do not claim to have performed an action unless the system actually performed it.

Return ONLY a JSON object:
{
  "answer": "direct, unique, and insightful answer to the user's specific question",
  "actions": [
    "specific actionable step 1",
    "specific actionable step 2"
  ],
  "references": [
    "actual task/sprint/startup data used"
  ],
  "source": "gemini"
}`;

  const candidateModels = [
    process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ];

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    for (const modelName of candidateModels) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout calling Gemini model ${modelName}`)), 15000)
        );
        const apiCall = ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const response = await Promise.race([apiCall, timeoutPromise]);
        let rawText = response.text || '';
        if (rawText.startsWith('```json')) {
          rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(rawText.trim());
        if (parsed && typeof parsed.answer === 'string' && parsed.answer.trim()) {
          return {
            answer: parsed.answer.trim(),
            actions: Array.isArray(parsed.actions) ? parsed.actions : [],
            references: Array.isArray(parsed.references) ? parsed.references : [],
            source: 'gemini',
          };
        }
      } catch (modelErr) {
        console.warn(`[DeveloperAIMentor] Candidate model ${modelName} failed (${modelErr.message}). Trying next candidate.`);
      }
    }
    throw new Error('All Gemini candidate models failed');
  } catch (aiErr) {
    console.warn('[DeveloperAIMentor] Gemini generation failed, using deterministic contextual fallback:', aiErr.message);
    return getDeveloperFallbackGuidance({
      startup,
      sprint,
      myTasks,
      allTasks,
      execution,
      riskAnalysis,
      developer,
      message,
    });
  }
};

/**
 * POST /api/developers/startups/:startupId/ai-mentor
 * Context-aware Developer AI Mentor answering questions grounded in startup and task reality.
 * Access: Authenticated DEVELOPER with ACTIVE TeamMembership in the target startup.
 */
const askDeveloperAIMentor = async (req, res) => {
  try {
    const { startupId } = req.params;
    const rawMsg = req.body.message || req.body.question;
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const userId = (req.user?.userId || req.user?.id)?.toString();

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Valid startup ID is required' });
    }

    if (!rawMsg || typeof rawMsg !== 'string' || !rawMsg.trim()) {
      return res.status(400).json({ success: false, message: 'Question or message is required' });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    // Verify active team membership
    const membership = await TeamMembership.findOne({
      startup: startupId,
      user: userId,
      status: 'ACTIVE',
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access the AI Mentor for this startup',
      });
    }

    const result = await generateDeveloperAIMentorResponse(startupId, userId, rawMsg.trim(), history);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Developer AI Mentor error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in Developer AI Mentor',
    });
  }
};

/**
 * POST /api/developers/resume
 * Authenticated DEVELOPER uploads or replaces their resume (PDF/DOC/DOCX up to 10MB)
 */
const uploadResume = (req, res) => {
  uploadResumeMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No resume file provided',
      });
    }

    try {
      const userId = (req.user?.userId || req.user?.id)?.toString();
      let profile = await DeveloperProfile.findOne({ user: userId });

      if (!profile) {
        profile = new DeveloperProfile({
          user: userId,
          skills: [],
          availability: 'AVAILABLE',
        });
      }

      // Delete old resume file if exists and is different
      if (profile.resumeFileName && profile.resumeFileName !== req.file.filename) {
        const oldPath = path.join(RESUME_UPLOAD_DIR, profile.resumeFileName);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (unlinkErr) {
            console.warn('Could not delete old resume file:', unlinkErr.message);
          }
        }
      }

      profile.resumeFileName = req.file.filename;
      profile.resumeOriginalName = req.file.originalname;
      profile.resumeMimeType = req.file.mimetype;
      profile.resumeUrl = `/api/developers/resume/${userId}`;
      profile.resumeUploadedAt = new Date();

      await profile.save();
      await profile.populate('user', 'name email role');

      return res.status(200).json({
        success: true,
        message: 'Resume uploaded successfully',
        data: formatProfile(profile),
      });
    } catch (saveErr) {
      console.error('Error saving uploaded resume metadata:', saveErr);
      return res.status(500).json({
        success: false,
        message: 'Server error while saving resume metadata',
      });
    }
  });
};

/**
 * GET /api/developers/resume/:userId
 * Securely stream or view a developer's resume.
 * Authorization rules:
 * - The developer themselves can access their own resume.
 * - A founder can view the resume ONLY IF this developer has applied to (JoinRequest) or is a member of (TeamMembership) at least one startup owned by that founder.
 * - All other users / unauthenticated users are forbidden (403).
 */
const getResume = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const requesterId = (req.user?.userId || req.user?.id)?.toString();
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access resumes',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    let isAuthorized = false;

    // 1. Is the requester the developer themselves?
    if (requesterId === targetUserId) {
      isAuthorized = true;
    } else if (requesterRole === 'FOUNDER') {
      // 2. Is the requester a founder whose startup has a join request or membership from this developer?
      const founderStartups = await Startup.find({ founder: requesterId }).select('_id');
      const startupIds = founderStartups.map((s) => s._id);

      if (startupIds.length > 0) {
        const hasJoinRequest = await JoinRequest.exists({
          startup: { $in: startupIds },
          developer: targetUserId,
        });

        const hasMembership = await TeamMembership.exists({
          startup: { $in: startupIds },
          user: targetUserId,
        });

        if (hasJoinRequest || hasMembership) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view this developer's resume",
      });
    }

    const profile = await DeveloperProfile.findOne({ user: targetUserId });
    if (!profile || !profile.resumeFileName) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found for this developer',
      });
    }

    const filePath = path.join(RESUME_UPLOAD_DIR, profile.resumeFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Resume file not found on server disk',
      });
    }

    const mimeType = profile.resumeMimeType || 'application/pdf';
    const originalName = profile.resumeOriginalName || 'Resume.pdf';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);

    return res.sendFile(filePath);
  } catch (error) {
    console.error('Get resume error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving resume',
    });
  }
};

module.exports = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  deleteMyProfile,
  getPublicProfile,
  getMyStartups,
  getDeveloperStartupWorkspace,
  getDeveloperFallbackGuidance,
  generateDeveloperAIMentorResponse,
  askDeveloperAIMentor,
  uploadResume,
  getResume,
};

