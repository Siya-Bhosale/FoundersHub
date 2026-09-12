const mongoose = require('mongoose');
const FundingInterest = require('../models/FundingInterest');
const Startup = require('../models/Startup');
const InvestorProfile = require('../models/InvestorProfile');

/**
 * POST /api/funding-interest
 * Express potential funding interest in a startup.
 * Access: INVESTOR role only.
 */
const createInterest = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'INVESTOR') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only users with the INVESTOR role can express funding interest',
      });
    }

    const { startupId, amount, message } = req.body;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    // Investor cannot invest in their own startup
    const founderIdStr = startup.founder ? startup.founder.toString() : '';
    if (founderIdStr === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot express funding interest in your own startup',
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Potential investment amount must be a positive number greater than 0',
      });
    }

    // Check for existing active interest
    const existingActiveInterest = await FundingInterest.findOne({
      startup: startupId,
      investor: userId,
      status: 'INTERESTED',
    });

    if (existingActiveInterest) {
      return res.status(400).json({
        success: false,
        message: 'You have already expressed active funding interest in this startup',
      });
    }

    const interest = await FundingInterest.create({
      startup: startupId,
      investor: userId,
      amount: parsedAmount,
      message: message && typeof message === 'string' ? message.trim() : '',
      status: 'INTERESTED',
    });

    const populated = await FundingInterest.findById(interest._id)
      .populate('startup', 'name tagline industry stage fundingRequired fundingReceived')
      .populate('investor', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Funding interest submitted successfully to founder',
      data: populated,
    });
  } catch (error) {
    console.error('Create funding interest error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while submitting funding interest',
    });
  }
};

/**
 * GET /api/funding-interest/my
 * Retrieve all funding interests submitted by the authenticated investor.
 * Access: INVESTOR role only.
 */
const getMyInterests = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const role = req.user?.role?.toUpperCase();

    if (role !== 'INVESTOR') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only users with the INVESTOR role can view their funding interests',
      });
    }

    const interests = await FundingInterest.find({ investor: userId })
      .populate('startup', 'name tagline industry stage fundingRequired fundingReceived')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: interests.length,
      data: interests,
    });
  } catch (error) {
    console.error('Get my funding interests error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching funding interests',
    });
  }
};

/**
 * GET /api/startups/:startupId/funding-interest
 * Retrieve all funding interests received for a startup.
 * Access: Startup FOUNDER only.
 */
const getStartupFundingInterests = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }

    // Verify ownership
    const founderIdStr = startup.founder ? startup.founder.toString() : '';
    const userIdStr = userId ? userId.toString() : '';

    const isOwner = founderIdStr === userIdStr ||
      (startup.founder && startup.founder.equals && startup.founder.equals(userId));

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the startup founder can view received funding interests',
      });
    }

    const interests = await FundingInterest.find({ startup: startupId })
      .populate('investor', 'name email')
      .sort({ createdAt: -1 });

    // Enrich with investor profile firm details if available
    const investorUserIds = interests.map((i) => i.investor?._id).filter(Boolean);
    const profiles = await InvestorProfile.find({ user: { $in: investorUserIds } });
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    const enriched = interests.map((item) => {
      const invUser = item.investor;
      const prof = invUser ? profileMap[invUser._id.toString()] : null;
      return {
        _id: item._id,
        id: item._id,
        startup: item.startup,
        investor: {
          id: invUser?._id,
          name: invUser?.name,
          email: invUser?.email,
          firmName: prof?.firmName || 'Angel Syndicate',
          bio: prof?.bio || '',
          investmentStages: prof?.investmentStages || [],
          industries: prof?.industries || [],
        },
        amount: item.amount,
        message: item.message,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    console.error('Get startup funding interests error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup funding interests',
    });
  }
};

module.exports = {
  createInterest,
  getMyInterests,
  getStartupFundingInterests,
};
