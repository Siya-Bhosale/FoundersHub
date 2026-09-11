const express = require('express');
const {
  createStartup,
  getMyStartups,
  getStartupById,
  updateStartup,
  deleteStartup,
} = require('../controllers/startupController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

// All startup routes require authentication
router.use(authMiddleware);

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

module.exports = router;
