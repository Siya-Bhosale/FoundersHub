const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  createInterest,
  getMyInterests,
  getStartupFundingInterests,
} = require('../controllers/fundingInterestController');

// All funding interest routes require authentication
router.use(authMiddleware);

// Express funding interest (Investor only)
router.post('/', requireRole('INVESTOR'), createInterest);

// My submitted funding interests (Investor only)
router.get('/my', requireRole('INVESTOR'), getMyInterests);

// Startup funding interests (Founder only)
router.get('/startup/:startupId', getStartupFundingInterests);

module.exports = router;
