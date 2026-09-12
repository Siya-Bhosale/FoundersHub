const mongoose = require('mongoose');
const Startup = require('../models/Startup');
const { generatePitch } = require('../services/pitchAiService');
const { askFounderCopilot } = require('../services/founderCopilotService');

/**
 * Checks if the authenticated user is the legitimate founder of the startup.
 */
function verifyFounderOwnership(startup, userId) {
  if (!startup || !userId) return false;
  const founder = startup.founder || startup.founderId;
  const founderStr = founder && typeof founder === 'object' && founder._id
    ? founder._id.toString()
    : founder ? founder.toString() : null;
  return founderStr === userId.toString();
}

/**
 * POST /api/ai/pitch/:startupId
 * Generates an investor-ready structured pitch for a startup.
 * Access: Authenticated FOUNDER of the target startup only.
 */
const generatePitchHandler = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'FOUNDER') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only users with the FOUNDER role can generate pitch decks',
      });
    }

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    if (!verifyFounderOwnership(startup, userId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the founder of this startup',
      });
    }

    const pitch = await generatePitch(startupId);

    return res.status(200).json({
      success: true,
      data: pitch,
      pitch, // top-level backward compatibility
    });
  } catch (error) {
    console.error('Generate pitch error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while generating pitch deck',
    });
  }
};

/**
 * POST /api/ai/copilot/:startupId
 * Provides strategic, execution, and financial answers grounded in real startup data.
 * Access: Authenticated FOUNDER of the target startup only.
 */
const copilotHandler = async (req, res) => {
  try {
    const { startupId } = req.params;
    const rawMsg = req.body.message || req.body.question;
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'FOUNDER') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only users with the FOUNDER role can access the AI Mentor',
      });
    }

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    if (!rawMsg || typeof rawMsg !== 'string' || !rawMsg.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question or message is required',
      });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    if (!verifyFounderOwnership(startup, userId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the founder of this startup',
      });
    }

    const copilotResponse = await askFounderCopilot(startupId, rawMsg.trim(), history);

    return res.status(200).json({
      success: true,
      ...copilotResponse,
    });
  } catch (error) {
    console.error('Founder copilot error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing AI Mentor question',
    });
  }
};

module.exports = {
  generatePitchHandler,
  copilotHandler,
};
