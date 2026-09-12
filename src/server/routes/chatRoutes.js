const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getMyChats,
  getStartupChats,
  getDepartmentChat,
  getChatMessages,
  sendMessage,
} = require('../controllers/chatController');

// All chat routes require authentication
router.use(authMiddleware);

// Get authorized department chats for current user
router.get('/my', getMyChats);

// Get chats for startup
router.get('/startup/:startupId', getStartupChats);

// Get or initialize specific department chat
router.get('/startup/:startupId/department/:departmentId', getDepartmentChat);

// Get messages for a specific chat
router.get('/:chatId/messages', getChatMessages);

// Send message to a specific chat
router.post('/:chatId/messages', sendMessage);

module.exports = router;
