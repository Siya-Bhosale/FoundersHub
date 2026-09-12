import apiClient from './client';

/**
 * Get deterministic execution score for a startup.
 * GET /api/execution/startup/:startupId/score
 */
export const getStartupExecutionScore = async (startupId) => {
  return await apiClient(`/execution/startup/${startupId}/score`);
};

/**
 * Get latest stored execution risk analysis.
 * GET /api/ai/execution-risk/:startupId
 */
export const getStartupExecutionRisk = async (startupId) => {
  return await apiClient(`/ai/execution-risk/${startupId}`);
};

/**
 * Trigger AI execution risk analysis for a startup (Founder only).
 * POST /api/ai/execution-risk/:startupId
 */
export const analyzeStartupExecutionRisk = async (startupId) => {
  return await apiClient(`/ai/execution-risk/${startupId}`, {
    method: 'POST',
  });
};
