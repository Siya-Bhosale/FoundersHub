import apiClient from './client';

/**
 * Fetch the team members of a startup (Founder and active team members only)
 */
export const getStartupTeam = async (startupId) => {
  return await apiClient(`/startups/${startupId}/team`, {
    method: 'GET',
  });
};

/**
 * Founder moves a team member to a different department (or null for Unassigned)
 */
export const updateMemberDepartment = async (startupId, membershipId, departmentId) => {
  return await apiClient(`/startups/${startupId}/team/${membershipId}/department`, {
    method: 'PUT',
    body: { departmentId },
  });
};

