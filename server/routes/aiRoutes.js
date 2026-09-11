const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Founder-only startup idea analysis routes
router.post(
  '/startup-analysis/:startupId',
  authMiddleware,
  requireRole('FOUNDER'),
  aiController.analyzeStartup
);

router.get(
  '/startup-analysis/:startupId',
  authMiddleware,
  requireRole('FOUNDER'),
  aiController.getStartupAnalysis
);

module.exports = router;
