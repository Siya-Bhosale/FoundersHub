const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getStartupExecutionScore } = require('../controllers/executionController');

// GET /api/execution/startup/:startupId/score
router.get('/startup/:startupId/score', authMiddleware, getStartupExecutionScore);

module.exports = router;
