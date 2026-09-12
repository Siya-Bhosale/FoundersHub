import apiClient from './client';

/**
 * Request generation of an investor-ready structured pitch deck.
 */
export const generatePitch = async (startupId) => {
  return apiClient(`/ai/pitch/${startupId}`, {
    method: 'POST',
  });
};

/**
 * Ask the Founder Copilot / AI Mentor a strategic or execution question.
 */
export const askCopilot = async (startupId, message, history = []) => {
  return apiClient(`/ai/copilot/${startupId}`, {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
};
