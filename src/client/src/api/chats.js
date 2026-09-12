import apiClient from './client';

/**
 * Get all authorized department chats for current user.
 * GET /api/chats/my
 */
export const getMyChats = async () => {
  return await apiClient('/chats/my');
};

/**
 * Get accessible department chats for a startup.
 * GET /api/chats/startup/:startupId
 */
export const getStartupChats = async (startupId) => {
  return await apiClient(`/chats/startup/${startupId}`);
};

/**
 * Get or initialize a specific department chat and its members.
 * GET /api/chats/startup/:startupId/department/:departmentId
 */
export const getDepartmentChat = async (startupId, departmentId) => {
  return await apiClient(`/chats/startup/${startupId}/department/${departmentId}`);
};

/**
 * Get chronological messages for a chat.
 * GET /api/chats/:chatId/messages
 */
export const getChatMessages = async (chatId) => {
  return await apiClient(`/chats/${chatId}/messages`);
};

/**
 * Send a new message to a department chat.
 * POST /api/chats/:chatId/messages
 */
export const sendMessage = async (chatId, message) => {
  return await apiClient(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: { message },
  });
};
