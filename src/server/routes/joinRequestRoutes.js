const express = require('express');
const {
  createJoinRequest,
  getMyJoinRequests,
  getStartupJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
} = require('../controllers/joinRequestController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

// All join request routes require authentication
router.use(authMiddleware);

// POST /api/join-requests (Only DEVELOPER can submit a join request)
router.post('/', requireRole('DEVELOPER'), createJoinRequest);
router.post('/:startupId', requireRole('DEVELOPER'), createJoinRequest);

// GET /api/join-requests/my (Only DEVELOPER can view their own join requests)
router.get('/my', requireRole('DEVELOPER'), getMyJoinRequests);

// GET /api/join-requests/startup/:startupId (Only FOUNDER can view requests for their startup)
router.get('/startup/:startupId', requireRole('FOUNDER'), getStartupJoinRequests);

// PUT & POST /api/join-requests/:requestId/accept (Only FOUNDER can accept a join request)
router.put('/:requestId/accept', requireRole('FOUNDER'), acceptJoinRequest);
router.post('/:requestId/accept', requireRole('FOUNDER'), acceptJoinRequest);

// PUT & POST /api/join-requests/:requestId/reject (Only FOUNDER can reject a join request)
router.put('/:requestId/reject', requireRole('FOUNDER'), rejectJoinRequest);
router.post('/:requestId/reject', requireRole('FOUNDER'), rejectJoinRequest);

module.exports = router;
