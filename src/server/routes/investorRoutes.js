const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  createProfile,
  getMyProfile,
  updateProfile,
  getPublicProfile,
  getMatches,
  getMatchDetail,
} = require('../controllers/investorController');

// Profile routes
router.post('/profile', authMiddleware, requireRole('INVESTOR'), createProfile);
router.get('/profile', authMiddleware, requireRole('INVESTOR'), getMyProfile);
router.put('/profile', authMiddleware, requireRole('INVESTOR'), updateProfile);

// Startup matching routes
router.get('/matches', authMiddleware, requireRole('INVESTOR'), getMatches);
router.get('/matches/:startupId', authMiddleware, requireRole('INVESTOR'), getMatchDetail);

// Public profile route
router.get('/:id', getPublicProfile);

module.exports = router;
