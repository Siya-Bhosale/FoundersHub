const express = require('express');
const {
  createStartup,
  getMyStartups,
  getStartupById,
  updateStartup,
  deleteStartup,
  getAllStartups,
} = require('../controllers/startupController');
const { getStartupJoinRequests, createJoinRequest } = require('../controllers/joinRequestController');
const { getStartupTeam } = require('../controllers/teamController');
const { createTask, getStartupTasks } = require('../controllers/taskController');
const { getStartupFundingInterests } = require('../controllers/fundingInterestController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

// All startup routes require authentication
router.use(authMiddleware);

// GET /api/startups (Discover/browse all startups)
router.get('/', getAllStartups);

// POST /api/startups (Only FOUNDER can create startups)
router.post('/', requireRole('FOUNDER'), createStartup);

// GET /api/startups/my (Get startups belonging to the authenticated founder)
router.get('/my', getMyStartups);

// GET /api/startups/:id (Get single startup by ID)
router.get('/:id', getStartupById);

// PUT /api/startups/:id (Update startup - owner only)
router.put('/:id', updateStartup);

// DELETE /api/startups/:id (Delete startup - owner only)
router.delete('/:id', deleteStartup);

// Join Requests under startup
// GET /api/startups/:startupId/join-requests (Only FOUNDER can view requests for their startup)
router.get('/:startupId/join-requests', requireRole('FOUNDER'), getStartupJoinRequests);
// POST /api/startups/:startupId/join-requests (Only DEVELOPER can submit join request)
router.post('/:startupId/join-requests', requireRole('DEVELOPER'), createJoinRequest);

// GET /api/startups/:startupId/team (Founder or active team members can view startup team)
router.get('/:startupId/team', getStartupTeam);

// Tasks under startup
router.post('/:startupId/tasks', createTask);
router.get('/:startupId/tasks', getStartupTasks);

// GET /api/startups/:startupId/funding-interest (Founder only)
router.get('/:startupId/funding-interest', requireRole('FOUNDER'), getStartupFundingInterests);

module.exports = router;
