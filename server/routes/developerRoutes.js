const express = require('express');
const router = express.Router();
const developerController = require('../controllers/developerController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Developer-only profile management routes
router.post('/profile', authMiddleware, requireRole('DEVELOPER'), developerController.createProfile);
router.get('/profile', authMiddleware, requireRole('DEVELOPER'), developerController.getMyProfile);
router.put('/profile', authMiddleware, requireRole('DEVELOPER'), developerController.updateMyProfile);
router.delete('/profile', authMiddleware, requireRole('DEVELOPER'), developerController.deleteMyProfile);

// Developer-only Startup Workspace & Membership routes
router.get('/my-startups', authMiddleware, requireRole('DEVELOPER'), developerController.getMyStartups);
router.get('/startups/:startupId', authMiddleware, requireRole('DEVELOPER'), developerController.getDeveloperStartupWorkspace);
router.post('/startups/:startupId/ai-mentor', authMiddleware, requireRole('DEVELOPER'), developerController.askDeveloperAIMentor);

// Public profile route (accessible to authenticated users: Founders, Developers, Investors)
router.get('/:id', authMiddleware, developerController.getPublicProfile);

module.exports = router;
