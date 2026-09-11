const mongoose = require('mongoose');
const Startup = require('../models/Startup');

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
    const startups = await Startup.find({ founder: req.user.userId }).sort({ createdAt: -1 });

    const formattedStartups = startups.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      tagline: s.tagline,
      problemStatement: s.problemStatement,
      solution: s.solution,
      industry: s.industry,
      stage: s.stage,
      description: s.description,
      founder: s.founder.toString(),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      startups: formattedStartups,
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

    const founderData = startup.founder && typeof startup.founder === 'object' && startup.founder._id
      ? {
          id: startup.founder._id.toString(),
          name: startup.founder.name,
          email: startup.founder.email,
          role: startup.founder.role,
        }
      : startup.founder ? startup.founder.toString() : null;

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

module.exports = {
  createStartup,
  getMyStartups,
  getStartupById,
  updateStartup,
  deleteStartup,
};
