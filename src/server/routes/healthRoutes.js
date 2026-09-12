const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/health
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SprintFounders API is running',
  });
});

// GET /api/health/db
router.get('/db', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const status = states[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    success: isConnected,
    status,
    message: isConnected ? 'Database is connected' : 'Database is not connected',
  });
});

module.exports = router;
