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
const { getStartupTeam, updateMemberDepartment } = require('../controllers/teamController');
const {
  getStartupDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
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
router.put('/:id', requireRole('FOUNDER'), updateStartup);

// DELETE /api/startups/:id (Delete startup - owner only)
router.delete('/:id', requireRole('FOUNDER'), deleteStartup);

// Departments under startup
router.get('/:startupId/departments', getStartupDepartments);
router.get('/:startupId/departments/:departmentId', getDepartmentById);
router.post('/:startupId/departments', requireRole('FOUNDER'), createDepartment);
router.put('/:startupId/departments/:departmentId', requireRole('FOUNDER'), updateDepartment);
router.delete('/:startupId/departments/:departmentId', requireRole('FOUNDER'), deleteDepartment);

// Join Requests under startup
// GET /api/startups/:startupId/join-requests (Only FOUNDER can view requests for their startup)
router.get('/:startupId/join-requests', requireRole('FOUNDER'), getStartupJoinRequests);
// POST /api/startups/:startupId/join-requests (Only DEVELOPER can submit join request)
router.post('/:startupId/join-requests', requireRole('DEVELOPER'), createJoinRequest);

// Team under startup
// GET /api/startups/:startupId/team (Founder or active team members can view startup team)
router.get('/:startupId/team', getStartupTeam);
// PUT /api/startups/:startupId/team/:membershipId/department (Founder can move member between departments)
router.put('/:startupId/team/:membershipId/department', requireRole('FOUNDER'), updateMemberDepartment);

// Tasks under startup
router.post('/:startupId/tasks', createTask);
router.get('/:startupId/tasks', getStartupTasks);

// GET /api/startups/:startupId/funding-interest (Founder only)
router.get('/:startupId/funding-interest', requireRole('FOUNDER'), getStartupFundingInterests);

module.exports = router;
