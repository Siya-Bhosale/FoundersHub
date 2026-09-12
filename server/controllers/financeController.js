const mongoose = require('mongoose');
const FinancialTransaction = require('../models/FinancialTransaction');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');
const { calculateFinanceSummary } = require('../services/financeService');

const ALLOWED_CATEGORIES = [
  'REVENUE',
  'SALARY',
  'MARKETING',
  'INFRASTRUCTURE',
  'SOFTWARE',
  'OPERATIONS',
  'LEGAL',
  'OFFICE',
  'OTHER',
];

/**
 * Helper: Extract founder ID as string safely from a Startup document.
 * Handles:
 * - ObjectId instance
 * - String ID
 * - Populated user object: { _id, id }
 * - Legacy founderId field if founder is absent
 */
function getStartupFounderId(startup) {
  if (!startup) return null;
  const f = startup.founder || startup.founderId;
  if (!f) return null;
  if (typeof f === 'object') {
    return (f._id || f.id || f).toString();
  }
  return f.toString();
}

/**
 * Helper: Check startup access
 */
async function checkStartupAccess(startupId, userId) {
  if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
    return { invalidId: true, allowed: false, isFounder: false };
  }

  const startup = await Startup.findById(startupId);
  if (!startup) {
    return { notFound: true, allowed: false, isFounder: false };
  }

  const founderIdStr = getStartupFounderId(startup);
  const userIdStr = (userId?._id || userId?.id || userId?.userId || userId || '').toString();

  let isFounder = false;
  if (founderIdStr && userIdStr) {
    if (founderIdStr === userIdStr) {
      isFounder = true;
    } else if (
      mongoose.Types.ObjectId.isValid(founderIdStr) &&
      mongoose.Types.ObjectId.isValid(userIdStr) &&
      new mongoose.Types.ObjectId(founderIdStr).equals(new mongoose.Types.ObjectId(userIdStr))
    ) {
      isFounder = true;
    }
  }

  if (isFounder) {
    return { allowed: true, isFounder: true, startup };
  }

  // Check active team membership
  if (userIdStr && mongoose.Types.ObjectId.isValid(userIdStr)) {
    const membership = await TeamMembership.findOne({
      startup: startup._id,
      user: new mongoose.Types.ObjectId(userIdStr),
      status: 'ACTIVE',
    });

    if (membership) {
      return { allowed: true, isFounder: false, startup, membership };
    }
  }

  return { allowed: false, isFounder: false, startup };
}

/**
 * POST /api/finance/:startupId/transactions
 * Create a new income or expense transaction.
 * Access: Founder only.
 */
const createTransaction = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    const access = await checkStartupAccess(startupId, userId);
    if (access.invalidId) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }
    if (access.notFound) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!access.isFounder) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the startup founder can create financial transactions',
      });
    }

    const { type, category, amount, description, date } = req.body;

    if (!type || !['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Transaction type must be INCOME or EXPENSE',
      });
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Transaction amount must be a positive number greater than 0',
      });
    }

    const txDate = date ? new Date(date) : new Date();
    if (isNaN(txDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Valid transaction date is required',
      });
    }

    const transaction = await FinancialTransaction.create({
      startup: startupId,
      type,
      category,
      amount: parsedAmount,
      description: description && typeof description === 'string' ? description.trim() : '',
      date: txDate,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: transaction,
    });
  } catch (error) {
    console.error('Create transaction error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating transaction',
    });
  }
};

/**
 * GET /api/finance/:startupId/transactions
 * List transactions for a startup.
 * Access: Founder or Active Team Member.
 */
const getTransactions = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    const access = await checkStartupAccess(startupId, userId);
    if (access.invalidId) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }
    if (access.notFound) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view transactions for this startup',
      });
    }

    const { type, category } = req.query;
    const filter = { startup: startupId };
    if (type && ['INCOME', 'EXPENSE'].includes(type.toUpperCase())) {
      filter.type = type.toUpperCase();
    }
    if (category && ALLOWED_CATEGORIES.includes(category.toUpperCase())) {
      filter.category = category.toUpperCase();
    }

    const transactions = await FinancialTransaction.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions',
    });
  }
};

/**
 * DELETE /api/finance/transactions/:transactionId
 * Delete an individual financial transaction.
 * Access: Startup founder only.
 */
const deleteTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
    }

    const transaction = await FinancialTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const access = await checkStartupAccess(transaction.startup, userId);
    if (access.notFound || access.invalidId) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!access.isFounder) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the startup founder can delete financial transactions',
      });
    }

    await FinancialTransaction.findByIdAndDelete(transactionId);

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Delete transaction error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting transaction',
    });
  }
};

/**
 * PUT /api/finance/:startupId/funding
 * Update startup funding details (initialCapital, fundingReceived, fundingRequired).
 * Access: Founder only.
 */
const updateFunding = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    const access = await checkStartupAccess(startupId, userId);
    if (access.invalidId) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }
    if (access.notFound) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!access.isFounder) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the startup founder can update funding information',
      });
    }

    const { fundingRequired, fundingReceived, initialCapital } = req.body;
    const startup = access.startup;

    if (fundingRequired !== undefined) {
      const fr = Number(fundingRequired);
      if (isNaN(fr) || fr < 0) {
        return res.status(400).json({
          success: false,
          message: 'fundingRequired must be a non-negative number',
        });
      }
      startup.fundingRequired = fr;
    }

    if (fundingReceived !== undefined) {
      const rec = Number(fundingReceived);
      if (isNaN(rec) || rec < 0) {
        return res.status(400).json({
          success: false,
          message: 'fundingReceived must be a non-negative number',
        });
      }
      startup.fundingReceived = rec;
    }

    if (initialCapital !== undefined) {
      const ic = Number(initialCapital);
      if (isNaN(ic) || ic < 0) {
        return res.status(400).json({
          success: false,
          message: 'initialCapital must be a non-negative number',
        });
      }
      startup.initialCapital = ic;
    }

    await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Funding details updated successfully',
      funding: {
        fundingRequired: startup.fundingRequired,
        fundingReceived: startup.fundingReceived,
        initialCapital: startup.initialCapital,
      },
    });
  } catch (error) {
    console.error('Update funding error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating funding details',
    });
  }
};

/**
 * GET /api/finance/:startupId/summary
 * Deterministic calculation of startup financial metrics.
 * Access: Founder or Active Team Member.
 */
const getFinanceSummary = async (req, res) => {
  try {
    const { startupId } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }

    const access = await checkStartupAccess(startupId, userId);
    if (access.invalidId) {
      return res.status(400).json({ success: false, message: 'Invalid startup ID' });
    }
    if (access.notFound) {
      return res.status(404).json({ success: false, message: 'Startup not found' });
    }
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view financial summary for this startup',
      });
    }

    const summary = await calculateFinanceSummary(startupId);

    return res.status(200).json({
      success: true,
      startup: {
        id: access.startup._id,
        name: access.startup.name,
        stage: access.startup.stage,
      },
      ...summary,
    });
  } catch (error) {
    console.error('Finance summary error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while calculating financial summary',
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  deleteTransaction,
  updateFunding,
  getFinanceSummary,
};
