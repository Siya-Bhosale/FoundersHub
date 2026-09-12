const mongoose = require('mongoose');

const developerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
      default: '',
    },
    skills: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    experience: {
      type: String,
      trim: true,
      maxlength: [200, 'Experience description cannot exceed 200 characters'],
      default: '',
    },
    education: {
      type: String,
      trim: true,
      maxlength: [300, 'Education cannot exceed 300 characters'],
      default: '',
    },
    github: {
      type: String,
      trim: true,
      default: '',
    },
    linkedin: {
      type: String,
      trim: true,
      default: '',
    },
    portfolio: {
      type: String,
      trim: true,
      default: '',
    },
    twitter: {
      type: String,
      trim: true,
      default: '',
    },
    otherSocial: {
      type: String,
      trim: true,
      default: '',
    },
    resumeUrl: {
      type: String,
      trim: true,
      default: '',
    },
    resumeFileName: {
      type: String,
      trim: true,
      default: '',
    },
    resumeOriginalName: {
      type: String,
      trim: true,
      default: '',
    },
    resumeMimeType: {
      type: String,
      trim: true,
      default: '',
    },
    resumeUploadedAt: {
      type: Date,
      default: null,
    },
    availability: {
      type: String,
      enum: {
        values: ['AVAILABLE', 'PART_TIME', 'NOT_AVAILABLE'],
        message: 'Availability must be AVAILABLE, PART_TIME, or NOT_AVAILABLE',
      },
      default: 'AVAILABLE',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DeveloperProfile', developerProfileSchema);
