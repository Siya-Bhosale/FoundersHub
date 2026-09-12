const mongoose = require('mongoose');
const InvestorProfile = require('../models/InvestorProfile');
const Startup = require('../models/Startup');
const User = require('../models/User');
const {
  calculateStartupMatch,
  rankStartupsForInvestor,
} = require('../services/investorMatchService');
const { explainInvestorMatch } = require('../services/investorMatchAiService');
const { calculateExecutionScore } = require('../services/executionScoreService');

/**
 * POST /api/investors/profile
 * Create investor profile.
 * Access: INVESTOR role only.
 */
const createProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'INVESTOR') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only users with the INVESTOR role can create an investor profile',
      });
    }

    const existingProfile = await InvestorProfile.findOne({ user: userId });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Investor profile already exists for this user',
      });
    }

    const {
      bio,
      firmName,
      investmentStages,
      industries,
      minInvestment,
      maxInvestment,
      preferredGeographies,
      website,
      portfolioDescription,
    } = req.body;

    const minNum = minInvestment !== undefined ? Number(minInvestment) : 0;
    const maxNum = maxInvestment !== undefined ? Number(maxInvestment) : 0;

    if (isNaN(minNum) || minNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'minInvestment must be a non-negative number',
      });
    }

    if (isNaN(maxNum) || maxNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'maxInvestment must be a non-negative number',
      });
    }

    if (maxNum > 0 && minNum > maxNum) {
      return res.status(400).json({
        success: false,
        message: 'minInvestment cannot exceed maxInvestment',
      });
    }

    const profile = await InvestorProfile.create({
      user: userId,
      bio: bio && typeof bio === 'string' ? bio.trim() : '',
      firmName: firmName && typeof firmName === 'string' ? firmName.trim() : '',
      investmentStages: Array.isArray(investmentStages) ? investmentStages : [],
      industries: Array.isArray(industries) ? industries : [],
      minInvestment: minNum,
      maxInvestment: maxNum,
      preferredGeographies: Array.isArray(preferredGeographies) ? preferredGeographies : [],
      website: website && typeof website === 'string' ? website.trim() : '',
      portfolioDescription: portfolioDescription && typeof portfolioDescription === 'string' ? portfolioDescription.trim() : '',
    });

    const populated = await InvestorProfile.findById(profile._id).populate('user', 'name email role');

    return res.status(201).json({
      success: true,
      message: 'Investor profile created successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Create investor profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating investor profile',
    });
  }
};

/**
 * GET /api/investors/profile
 * Retrieve authenticated investor's profile.
 * Access: INVESTOR role only.
 */
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'INVESTOR') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only users with the INVESTOR role can access this profile',
      });
    }

    const profile = await InvestorProfile.findOne({ user: userId }).populate('user', 'name email role');
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Investor profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Get my investor profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching investor profile',
    });
  }
};

/**
 * PUT /api/investors/profile
 * Update authenticated investor's profile.
 * Access: INVESTOR role only.
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'INVESTOR') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only users with the INVESTOR role can update this profile',
      });
    }

    let profile = await InvestorProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Investor profile not found. Please create a profile first.',
      });
    }

    const {
      bio,
      firmName,
      investmentStages,
      industries,
      minInvestment,
      maxInvestment,
      preferredGeographies,
      website,
      portfolioDescription,
    } = req.body;

    if (bio !== undefined) profile.bio = bio.trim();
    if (firmName !== undefined) profile.firmName = firmName.trim();
    if (Array.isArray(investmentStages)) profile.investmentStages = investmentStages;
    if (Array.isArray(industries)) profile.industries = industries;
    if (minInvestment !== undefined) {
      const minNum = Number(minInvestment);
      if (isNaN(minNum) || minNum < 0) {
        return res.status(400).json({ success: false, message: 'minInvestment must be a non-negative number' });
      }
      profile.minInvestment = minNum;
    }
    if (maxInvestment !== undefined) {
      const maxNum = Number(maxInvestment);
      if (isNaN(maxNum) || maxNum < 0) {
        return res.status(400).json({ success: false, message: 'maxInvestment must be a non-negative number' });
      }
      profile.maxInvestment = maxNum;
    }
    if (Array.isArray(preferredGeographies)) profile.preferredGeographies = preferredGeographies;
    if (website !== undefined) profile.website = website.trim();
    if (portfolioDescription !== undefined) profile.portfolioDescription = portfolioDescription.trim();

    await profile.save();
    const updated = await InvestorProfile.findById(profile._id).populate('user', 'name email role');

    return res.status(200).json({
      success: true,
      message: 'Investor profile updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Update investor profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating investor profile',
    });
  }
};

/**
 * GET /api/investors/:id
 * Retrieve sanitized public view of an investor profile.
 */
const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { user: id }] };
    } else {
      return res.status(400).json({ success: false, message: 'Invalid investor ID' });
    }

    const profile = await InvestorProfile.findOne(query).populate('user', 'name email role');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Investor profile not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: profile._id,
        user: {
          id: profile.user?._id,
          name: profile.user?.name,
          email: profile.user?.email,
        },
        firmName: profile.firmName,
        bio: profile.bio,
        investmentStages: profile.investmentStages,
        industries: profile.industries,
        minInvestment: profile.minInvestment,
        maxInvestment: profile.maxInvestment,
        preferredGeographies: profile.preferredGeographies,
        website: profile.website,
        portfolioDescription: profile.portfolioDescription,
      },
    });
  } catch (error) {
    console.error('Get public investor profile error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching public profile',
    });
  }
};

/**
 * GET /api/investors/matches
 * Retrieve all startups ranked by deterministic match score.
 * Access: INVESTOR role only.
 */
const getMatches = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'INVESTOR') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only authenticated investors can view startup match rankings',
      });
    }

    const matches = await rankStartupsForInvestor(userId);

    return res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error) {
    console.error('Get matches error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while calculating startup matches',
    });
  }
};

/**
 * GET /api/investors/matches/:startupId
 * Retrieve detailed match score breakdown for a specific startup.
 * Access: INVESTOR role only.
 */
const getMatchDetail = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'INVESTOR') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only authenticated investors can view match details',
      });
    }

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    let profile = await InvestorProfile.findOne({ user: userId });
    if (!profile) {
      profile = {
        industries: [],
        investmentStages: [],
        minInvestment: 0,
        maxInvestment: 10000000,
      };
    }

    const match = await calculateStartupMatch(startup, profile);

    return res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    console.error('Get match detail error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while calculating match detail',
    });
  }
};

/**
 * POST /api/ai/investor-match-explanation/:startupId
 * Generate Gemini AI explanation of the deterministic match score.
 * Access: INVESTOR role only.
 */
const getMatchExplanation = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'INVESTOR') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only authenticated investors can request match explanations',
      });
    }

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    let profile = await InvestorProfile.findOne({ user: userId });
    if (!profile) {
      profile = {
        industries: [],
        investmentStages: [],
        minInvestment: 0,
        maxInvestment: 10000000,
        firmName: 'Independent Investor',
      };
    }

    const match = await calculateStartupMatch(startup, profile);
    let execScore = 0;
    try {
      const exec = await calculateExecutionScore(startup._id);
      execScore = exec?.score || 0;
    } catch (e) {
      execScore = 0;
    }

    const explanation = await explainInvestorMatch({
      startup,
      investor: profile,
      matchScore: match.matchScore,
      components: match.components,
      executionScore: execScore,
    });

    return res.status(200).json({
      success: true,
      matchScore: match.matchScore,
      components: match.components,
      explanation,
      ...explanation,
    });
  } catch (error) {
    console.error('Match explanation error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while explaining match',
    });
  }
};

module.exports = {
  createProfile,
  getMyProfile,
  updateProfile,
  getPublicProfile,
  getMatches,
  getMatchDetail,
  getMatchExplanation,
};
