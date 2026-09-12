const mongoose = require('mongoose');
const Startup = require('../models/Startup');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const TeamMembership = require('../models/TeamMembership');
const DeveloperProfile = require('../models/DeveloperProfile');
const { analyzeStartupIdea } = require('../services/geminiService');
const { calculateExecutionScore } = require('../services/executionScoreService');
const { analyzeExecutionRisk } = require('../services/executionRiskService');

/**
 * POST /api/ai/startup-analysis/:startupId
 * Analyzes a founder's startup idea using Gemini AI (with fallback).
 */
const analyzeStartup = async (req, res) => {
  try {
    const { startupId } = req.params;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID',
      });
    }

    const startup = await Startup.findById(startupId);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    // Verify ownership: only the startup founder may analyze this startup
    if (startup.founder.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have permission to analyze this startup",
      });
    }

    const startupInput = {
      name: startup.name,
      tagline: startup.tagline,
      problemStatement: startup.problemStatement,
      solution: startup.solution,
      industry: startup.industry,
      stage: startup.stage,
      description: startup.description || '',
    };

    const analysis = await analyzeStartupIdea(startupInput);

    startup.aiAnalysis = {
      overallAssessment: analysis.overallAssessment,
      problemStrength: analysis.problemStrength,
      marketPotential: analysis.marketPotential,
      feasibility: analysis.feasibility,
      risks: analysis.risks,
      opportunities: analysis.opportunities,
      recommendations: analysis.recommendations,
      source: analysis.source,
      generatedAt: new Date(),
    };

    await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Startup idea analyzed successfully',
      data: startup.aiAnalysis,
    });
  } catch (error) {
    console.error('Error analyzing startup:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while analyzing startup idea',
    });
  }
};

/**
 * GET /api/ai/startup-analysis/:startupId
 * Retrieves the latest stored AI analysis for a founder's startup.
 */
const getStartupAnalysis = async (req, res) => {
  try {
    const { startupId } = req.params;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID',
      });
    }

    const startup = await Startup.findById(startupId);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    // Verify ownership
    if (startup.founder.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have permission to view analysis for this startup",
      });
    }

    if (!startup.aiAnalysis || !startup.aiAnalysis.overallAssessment) {
      return res.status(404).json({
        success: false,
        message: 'No AI analysis found for this startup',
      });
    }

    return res.status(200).json({
      success: true,
      data: startup.aiAnalysis,
    });
  } catch (error) {
    console.error('Error retrieving startup analysis:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup analysis',
    });
  }
};

/**
 * POST /api/ai/execution-risk/:startupId
 * Only FOUNDER of the startup can trigger AI Execution Risk Analysis.
 */
const analyzeStartupExecutionRisk = async (req, res) => {
  try {
    const { startupId } = req.params;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID',
      });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    // Role & Ownership check: Only FOUNDER who owns this startup
    const userId = req.user.userId.toString();
    if (startup.founder.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only the startup founder can analyze execution risks",
      });
    }

    // Role check: must be FOUNDER role
    if (req.user.role !== 'FOUNDER') {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only founder users can analyze execution risks",
      });
    }

    // Fetch active sprint
    const sprint = await Sprint.findOne({ startup: startupId, status: 'ACTIVE' }).sort({ createdAt: -1 });

    // Fetch tasks
    const tasks = await Task.find({ startup: startupId });

    // Fetch team memberships and developer profiles
    const memberships = await TeamMembership.find({ startup: startupId, status: 'ACTIVE' }).populate('user', 'name email');
    const team = [];
    for (const m of memberships) {
      const profile = await DeveloperProfile.findOne({ user: m.user?._id });
      team.push({
        role: m.role,
        user: m.user,
        profile,
      });
    }

    // Calculate deterministic execution score
    const executionScore = await calculateExecutionScore(startupId);

    // Call Gemini execution risk analyzer (with automatic fallback)
    const riskAnalysis = await analyzeExecutionRisk({
      startup,
      sprint,
      tasks,
      team,
      executionScore,
    });

    // Persist analysis to startup document
    startup.executionRiskAnalysis = {
      overallRisk: riskAnalysis.overallRisk,
      bottleneck: riskAnalysis.bottleneck,
      risks: riskAnalysis.risks,
      recommendations: riskAnalysis.recommendations,
      positiveSignals: riskAnalysis.positiveSignals,
      source: riskAnalysis.source,
      generatedAt: new Date(),
    };

    await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Execution risk analyzed successfully',
      data: startup.executionRiskAnalysis,
    });
  } catch (error) {
    console.error('Error analyzing execution risk:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while analyzing execution risks',
    });
  }
};

/**
 * GET /api/ai/execution-risk/:startupId
 * Retrieves latest stored execution risk analysis.
 * Access: Founder or Active Team Member.
 */
const getStartupExecutionRisk = async (req, res) => {
  try {
    const { startupId } = req.params;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID',
      });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found',
      });
    }

    // Access control: Founder or active team member
    const userId = req.user.userId.toString();
    const isFounder = startup.founder.toString() === userId;

    if (!isFounder) {
      const activeMembership = await TeamMembership.findOne({
        startup: startupId,
        user: userId,
        status: 'ACTIVE',
      });

      if (!activeMembership) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You don't have permission to view execution risks for this startup",
        });
      }
    }

    if (!startup.executionRiskAnalysis || !startup.executionRiskAnalysis.overallRisk) {
      return res.status(404).json({
        success: false,
        message: 'No execution risk analysis found for this startup',
      });
    }

    return res.status(200).json({
      success: true,
      data: startup.executionRiskAnalysis,
    });
  } catch (error) {
    console.error('Error retrieving execution risk analysis:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching execution risk analysis',
    });
  }
};

module.exports = {
  analyzeStartup,
  getStartupAnalysis,
  analyzeStartupExecutionRisk,
  getStartupExecutionRisk,
};
