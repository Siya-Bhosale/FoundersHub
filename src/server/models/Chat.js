const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Startup',
      required: [true, 'Startup reference is required'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
    },
    name: {
      type: String,
      required: [true, 'Chat name is required'],
      trim: true,
      maxlength: [100, 'Chat name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: ['DEPARTMENT'],
      default: 'DEPARTMENT',
    },
  },
  {
    timestamps: true,
  }
);

// Exactly ONE department chat per startup + department + type
chatSchema.index({ startup: 1, department: 1, type: 1 }, { unique: true });
chatSchema.index({ startup: 1, department: 1 });

module.exports = mongoose.model('Chat', chatSchema);
