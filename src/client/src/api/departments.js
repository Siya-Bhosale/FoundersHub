import apiClient from './client';

/**
 * Fetch departments belonging to a specific startup.
 * GET /api/startups/:startupId/departments
 */
export const getStartupDepartments = async (startupId) => {
  return await apiClient(`/startups/${startupId}/departments`, {
    method: 'GET',
  });
};

/**
 * Founder creates a new department under a startup.
 * POST /api/startups/:startupId/departments
 */
export const createDepartment = async (startupId, { name, description }) => {
  return await apiClient(`/startups/${startupId}/departments`, {
    method: 'POST',
    body: { name, description },
  });
};

/**
 * Founder renames/updates a department.
 * PUT /api/startups/:startupId/departments/:departmentId
 */
export const updateDepartment = async (startupId, departmentId, { name, description }) => {
  return await apiClient(`/startups/${startupId}/departments/${departmentId}`, {
    method: 'PUT',
    body: { name, description },
  });
};

/**
 * Founder deletes a department.
 * DELETE /api/startups/:startupId/departments/:departmentId?force=true|false
 */
export const deleteDepartment = async (startupId, departmentId, { force = false } = {}) => {
  const qs = force ? '?force=true' : '';
  return await apiClient(`/startups/${startupId}/departments/${departmentId}${qs}`, {
    method: 'DELETE',
  });
};
