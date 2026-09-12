import apiClient from './client';

/**
 * Fetch the team members of a startup (Founder and active team members only)
 */
export const getStartupTeam = async (startupId) => {
  return await apiClient(`/startups/${startupId}/team`, {
    method: 'GET',
  });
};
