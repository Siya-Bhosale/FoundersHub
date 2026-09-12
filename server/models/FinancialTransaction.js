const mongoose = require('mongoose');

const financialTransactionSchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Startup',
      required: [true, 'Startup reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['INCOME', 'EXPENSE'],
        message: 'Transaction type must be INCOME or EXPENSE',
      },
      required: [true, 'Transaction type is required'],
    },
    category: {
      type: String,
      enum: {
        values: [
          'REVENUE',
          'SALARY',
          'MARKETING',
          'INFRASTRUCTURE',
          'SOFTWARE',
          'OPERATIONS',
          'LEGAL',
          'OFFICE',
          'OTHER',
        ],
        message: 'Invalid transaction category',
      },
      required: [true, 'Category is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('FinancialTransaction', financialTransactionSchema);
