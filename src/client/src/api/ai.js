import apiClient from './client';

/**
 * Trigger AI analysis for a startup idea.
 * POST /api/ai/startup-analysis/:startupId
 */
export const generateStartupAnalysis = async (startupId) => {
  return await apiClient(`/ai/startup-analysis/${startupId}`, {
    method: 'POST',
  });
};

/**
 * Retrieve the latest stored AI analysis for a startup.
 * GET /api/ai/startup-analysis/:startupId
 */
export const getStartupAnalysis = async (startupId) => {
  return await apiClient(`/ai/startup-analysis/${startupId}`, {
    method: 'GET',
  });
};
