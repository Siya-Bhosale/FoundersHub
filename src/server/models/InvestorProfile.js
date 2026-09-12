const mongoose = require('mongoose');

const investorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    bio: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    firmName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Firm name cannot exceed 100 characters'],
    },
    investmentStages: [
      {
        type: String,
        enum: {
          values: ['IDEA', 'MVP', 'EARLY_TRACTION', 'GROWTH'],
          message: 'Invalid investment stage',
        },
      },
    ],
    industries: [
      {
        type: String,
        trim: true,
      },
    ],
    minInvestment: {
      type: Number,
      required: [true, 'Minimum investment amount is required'],
      min: [0, 'Minimum investment must be a non-negative number'],
      default: 0,
    },
    maxInvestment: {
      type: Number,
      required: [true, 'Maximum investment amount is required'],
      min: [0, 'Maximum investment must be a non-negative number'],
      default: 0,
    },
    preferredGeographies: [
      {
        type: String,
        trim: true,
      },
    ],
    website: {
      type: String,
      trim: true,
      default: '',
    },
    portfolioDescription: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Portfolio description cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('InvestorProfile', investorProfileSchema);
