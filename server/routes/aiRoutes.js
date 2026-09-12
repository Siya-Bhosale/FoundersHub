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

// Execution Risk Analysis routes
router.post(
  '/execution-risk/:startupId',
  authMiddleware,
  requireRole('FOUNDER'),
  aiController.analyzeStartupExecutionRisk
);

router.get(
  '/execution-risk/:startupId',
  authMiddleware,
  aiController.getStartupExecutionRisk
);

// Investor Match Explanation route
const investorController = require('../controllers/investorController');
router.post(
  '/investor-match-explanation/:startupId',
  authMiddleware,
  requireRole('INVESTOR'),
  investorController.getMatchExplanation
);

// Phase 10: Pitch Generator & Founder Copilot routes
const pitchController = require('../controllers/pitchController');
router.post(
  '/pitch/:startupId',
  authMiddleware,
  requireRole('FOUNDER'),
  pitchController.generatePitchHandler
);

router.post(
  '/copilot/:startupId',
  authMiddleware,
  requireRole('FOUNDER'),
  pitchController.copilotHandler
);

// Phase 10 Refactor: AI Task Generation
const taskAiController = require('../controllers/taskAiController');
router.post(
  '/tasks/:startupId',
  authMiddleware,
  requireRole('FOUNDER'),
  taskAiController.generateAiTasksHandler
);

module.exports = router;
