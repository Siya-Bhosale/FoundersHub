const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Startup name is required'],
      trim: true,
      maxlength: [100, 'Startup name cannot exceed 100 characters'],
    },
    tagline: {
      type: String,
      required: [true, 'Tagline is required'],
      trim: true,
      maxlength: [200, 'Tagline cannot exceed 200 characters'],
    },
    problemStatement: {
      type: String,
      required: [true, 'Problem statement is required'],
      trim: true,
    },
    solution: {
      type: String,
      required: [true, 'Solution is required'],
      trim: true,
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
      trim: true,
    },
    stage: {
      type: String,
      required: [true, 'Stage is required'],
      enum: {
        values: ['IDEA', 'MVP', 'EARLY_TRACTION', 'GROWTH'],
        message: 'Stage must be IDEA, MVP, EARLY_TRACTION, or GROWTH',
      },
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    founder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Founder reference is required'],
    },
    aiAnalysis: {
      type: new mongoose.Schema(
        {
          overallAssessment: {
            type: String,
            required: true,
          },
          problemStrength: {
            score: { type: Number, required: true, min: 1, max: 10 },
            explanation: { type: String, required: true },
          },
          marketPotential: {
            score: { type: Number, required: true, min: 1, max: 10 },
            explanation: { type: String, required: true },
          },
          feasibility: {
            score: { type: Number, required: true, min: 1, max: 10 },
            explanation: { type: String, required: true },
          },
          risks: [{ type: String }],
          opportunities: [{ type: String }],
          recommendations: [{ type: String }],
          source: {
            type: String,
            enum: ['gemini', 'fallback'],
            required: true,
          },
          generatedAt: {
            type: Date,
            default: Date.now,
          },
        },
        { _id: false }
      ),
      default: null,
    },
    executionRiskAnalysis: {
      type: new mongoose.Schema(
        {
          overallRisk: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            required: true,
          },
          bottleneck: {
            title: { type: String, required: true },
            description: { type: String, required: true },
          },
          risks: [
            {
              title: { type: String, required: true },
              description: { type: String, required: true },
              impact: {
                type: String,
                enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                default: 'MEDIUM',
              },
            },
          ],
          recommendations: [
            {
              priority: { type: String, default: 'HIGH' },
              action: { type: String, required: true },
              reason: { type: String, required: true },
            },
          ],
          positiveSignals: [{ type: String }],
          source: {
            type: String,
            enum: ['gemini', 'fallback'],
            required: true,
          },
          generatedAt: {
            type: Date,
            default: Date.now,
          },
        },
        { _id: false }
      ),
      default: null,
    },
    fundingRequired: {
      type: Number,
      default: 0,
      min: [0, 'Funding required cannot be negative'],
    },
    fundingReceived: {
      type: Number,
      default: 0,
      min: [0, 'Funding received cannot be negative'],
    },
    initialCapital: {
      type: Number,
      default: 0,
      min: [0, 'Initial capital cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Startup', startupSchema);
