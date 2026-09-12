import apiClient from './client';

/**
 * Get all tasks for a startup.
 * GET /api/startups/:startupId/tasks
 */
export const getStartupTasks = async (startupId, params = {}) => {
  const query = new URLSearchParams();
  if (params.view) query.append('view', params.view);
  if (params.departmentId && params.departmentId !== 'ALL') query.append('departmentId', params.departmentId);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return await apiClient(`/startups/${startupId}/tasks${qs}`);
};

/**
 * Create a new task under a startup.
 * POST /api/startups/:startupId/tasks
 */
export const createStartupTask = async (startupId, taskData) => {
  return await apiClient(`/startups/${startupId}/tasks`, {
    method: 'POST',
    body: taskData,
  });
};

/**
 * Update an existing task.
 * PUT /api/tasks/:taskId
 */
export const updateTask = async (taskId, updateData) => {
  return await apiClient(`/tasks/${taskId}`, {
    method: 'PUT',
    body: updateData,
  });
};

/**
 * Get tasks assigned to current logged-in developer.
 * GET /api/tasks/my-tasks
 */
export const getMyTasks = async () => {
  return await apiClient('/tasks/my-tasks');
};

/**
 * Generate AI tasks using Gemini for startup execution.
 * POST /api/ai/tasks/:startupId
 */
export const generateAiTasks = async (startupId) => {
  return await apiClient(`/ai/tasks/${startupId}`, {
    method: 'POST',
  });
};

/**
 * Batch create reviewed AI tasks.
 * POST /api/tasks/batch/:startupId
 */
export const createBatchTasks = async (startupId, tasks) => {
  return await apiClient(`/tasks/batch/${startupId}`, {
    method: 'POST',
    body: { tasks },
  });
};
