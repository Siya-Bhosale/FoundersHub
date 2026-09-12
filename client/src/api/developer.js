import apiClient from './client';

/**
 * Get the authenticated developer's profile
 */
export const getMyDeveloperProfile = async () => {
  return await apiClient('/developers/profile', { method: 'GET' });
};

/**
 * Create the authenticated developer's profile
 */
export const createDeveloperProfile = async (profileData) => {
  const payload = {
    bio: profileData.bio || '',
    skills: Array.isArray(profileData.skills) ? profileData.skills : [],
    experience: profileData.experience || '',
    education: profileData.education || '',
    github: profileData.github || '',
    linkedin: profileData.linkedin || '',
    portfolio: profileData.portfolio || '',
    twitter: profileData.twitter || '',
    otherSocial: profileData.otherSocial || '',
    availability: profileData.availability || 'AVAILABLE',
  };

  return await apiClient('/developers/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Update the authenticated developer's profile
 */
export const updateDeveloperProfile = async (profileData) => {
  const payload = {
    bio: profileData.bio !== undefined ? profileData.bio : '',
    skills: Array.isArray(profileData.skills) ? profileData.skills : [],
    experience: profileData.experience !== undefined ? profileData.experience : '',
    education: profileData.education !== undefined ? profileData.education : '',
    github: profileData.github !== undefined ? profileData.github : '',
    linkedin: profileData.linkedin !== undefined ? profileData.linkedin : '',
    portfolio: profileData.portfolio !== undefined ? profileData.portfolio : '',
    twitter: profileData.twitter !== undefined ? profileData.twitter : '',
    otherSocial: profileData.otherSocial !== undefined ? profileData.otherSocial : '',
    availability: profileData.availability || 'AVAILABLE',
  };

  return await apiClient('/developers/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Upload developer resume file (PDF, DOC, DOCX up to 10MB)
 */
export const uploadDeveloperResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);

  return await apiClient('/developers/resume', {
    method: 'POST',
    body: formData,
  });
};

/**
 * Delete the authenticated developer's profile
 */
export const deleteDeveloperProfile = async () => {
  return await apiClient('/developers/profile', {
    method: 'DELETE',
  });
};

/**
 * Get a developer's public profile by profile ID or user ID
 */
export const getPublicDeveloperProfile = async (id) => {
  return await apiClient(`/developers/${id}`, {
    method: 'GET',
  });
};

/**
 * Get startups where the authenticated developer has an ACTIVE membership
 */
export const getMyDeveloperStartups = async () => {
  return await apiClient('/developers/my-startups', {
    method: 'GET',
  });
};

/**
 * Get workspace overview summary for a specific startup
 */
export const getDeveloperStartupWorkspace = async (startupId) => {
  return await apiClient(`/developers/startups/${startupId}`, {
    method: 'GET',
  });
};

/**
 * Query developer AI Mentor for guidance
 */
export const askDeveloperAIMentor = async (startupId, message, history = []) => {
  return await apiClient(`/developers/startups/${startupId}/ai-mentor`, {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
};
