const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Startup',
      required: [true, 'Startup reference is required'],
    },
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'],
        message: 'Status must be TODO, IN_PROGRESS, BLOCKED, or DONE',
      },
      default: 'TODO',
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        message: 'Priority must be LOW, MEDIUM, HIGH, or CRITICAL',
      },
      default: 'MEDIUM',
    },
    day: {
      type: Number,
      default: 1,
      min: 1,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    estimatedHours: {
      type: Number,
      default: 2,
      min: 0,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-populate or update completedAt before saving
taskSchema.pre('save', function () {
  if (this.isModified('status')) {
    if (this.status === 'DONE' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'DONE') {
      this.completedAt = null;
    }
  }
});

module.exports = mongoose.model('Task', taskSchema);
