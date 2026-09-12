const mongoose = require('mongoose');

const fundingInterestSchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Startup',
      required: [true, 'Startup reference is required'],
      index: true,
    },
    investor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Investor reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Potential investment amount is required'],
      min: [0.01, 'Potential investment amount must be greater than 0'],
    },
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['INTERESTED', 'WITHDRAWN'],
        message: 'Status must be INTERESTED or WITHDRAWN',
      },
      default: 'INTERESTED',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active interest lookups
fundingInterestSchema.index({ startup: 1, investor: 1, status: 1 });

module.exports = mongoose.model('FundingInterest', fundingInterestSchema);
