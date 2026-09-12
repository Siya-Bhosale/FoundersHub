import apiClient from './client';

/**
 * Submit a join request for a startup (DEVELOPER only)
 */
export const submitJoinRequest = async ({ startupId, message }) => {
  return await apiClient('/join-requests', {
    method: 'POST',
    body: JSON.stringify({ startupId, message }),
  });
};

/**
 * Fetch the authenticated developer's own submitted join requests (DEVELOPER only)
 */
export const getMyJoinRequests = async () => {
  return await apiClient('/join-requests/my', {
    method: 'GET',
  });
};

/**
 * Fetch all join requests for a founder's startup (FOUNDER only)
 */
export const getStartupJoinRequests = async (startupId) => {
  return await apiClient(`/startups/${startupId}/join-requests`, {
    method: 'GET',
  });
};

/**
 * Accept a pending join request (FOUNDER only)
 */
export const acceptJoinRequest = async (requestId) => {
  return await apiClient(`/join-requests/${requestId}/accept`, {
    method: 'PUT',
  });
};

/**
 * Reject a pending join request (FOUNDER only)
 */
export const rejectJoinRequest = async (requestId) => {
  return await apiClient(`/join-requests/${requestId}/reject`, {
    method: 'PUT',
  });
};
