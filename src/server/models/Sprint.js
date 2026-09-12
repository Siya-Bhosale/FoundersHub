const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Startup',
      required: [true, 'Startup reference is required'],
    },
    name: {
      type: String,
      required: [true, 'Sprint name is required'],
      trim: true,
      maxlength: [100, 'Sprint name cannot exceed 100 characters'],
    },
    goal: {
      type: String,
      trim: true,
      default: '',
    },
    duration: {
      type: Number, // In days
      default: 14,
      min: 1,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['PLANNING', 'ACTIVE', 'COMPLETED'],
        message: 'Sprint status must be PLANNING, ACTIVE, or COMPLETED',
      },
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate endDate if not provided
sprintSchema.pre('save', function () {
  if (!this.endDate && this.startDate && this.duration) {
    const end = new Date(this.startDate);
    end.setDate(end.getDate() + this.duration);
    this.endDate = end;
  }
});

module.exports = mongoose.model('Sprint', sprintSchema);
