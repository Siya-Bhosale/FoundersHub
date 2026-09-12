const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createTransaction,
  getTransactions,
  deleteTransaction,
  updateFunding,
  getFinanceSummary,
} = require('../controllers/financeController');

// All finance routes require authentication
router.use(authMiddleware);

// Transaction routes
router.post('/:startupId/transactions', createTransaction);
router.get('/:startupId/transactions', getTransactions);
router.delete('/transactions/:transactionId', deleteTransaction);

// Funding & Summary routes
router.put('/:startupId/funding', updateFunding);
router.get('/:startupId/summary', getFinanceSummary);

module.exports = router;
