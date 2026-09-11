const mongoose = require('mongoose');
const Startup = require('../models/Startup');
const { analyzeStartupIdea } = require('../services/geminiService');

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

module.exports = {
  analyzeStartup,
  getStartupAnalysis,
};
