const mongoose = require('mongoose');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');
const { calculateExecutionScore } = require('../services/executionScoreService');

/**
 * GET /api/execution/startup/:startupId/score
 * Returns the deterministic execution score (0-100) and grade for a startup.
 * Access: Startup Founder or Active Team Member.
 */
const getStartupExecutionScore = async (req, res) => {
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
          message: 'Forbidden: You do not have permission to view execution intelligence for this startup',
        });
      }
    }

    const scoreData = await calculateExecutionScore(startupId);

    return res.status(200).json({
      success: true,
      score: scoreData.score,
      grade: scoreData.grade,
      components: scoreData.components,
      summary: scoreData.summary,
      metadata: scoreData.metadata,
    });
  } catch (error) {
    console.error('Error calculating execution score:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while calculating execution score',
    });
  }
};

module.exports = {
  getStartupExecutionScore,
};
