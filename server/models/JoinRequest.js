const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Startup',
      required: [true, 'Startup reference is required'],
    },
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Developer user reference is required'],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'ACCEPTED', 'REJECTED'],
        message: 'Status must be PENDING, ACCEPTED, or REJECTED',
      },
      default: 'PENDING',
      required: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly query join requests for a startup and developer
joinRequestSchema.index({ startup: 1, developer: 1 });
joinRequestSchema.index({ startup: 1, status: 1 });
joinRequestSchema.index({ developer: 1, status: 1 });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
