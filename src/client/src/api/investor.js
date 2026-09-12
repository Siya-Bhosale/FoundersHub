import apiClient from './client';

export const getInvestorProfile = async () => {
  return apiClient('/investors/profile');
};

export const createInvestorProfile = async (profileData) => {
  return apiClient('/investors/profile', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
};

export const updateInvestorProfile = async (profileData) => {
  return apiClient('/investors/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const getInvestorMatches = async () => {
  return apiClient('/investors/matches');
};

export const getInvestorMatchDetail = async (startupId) => {
  return apiClient(`/investors/matches/${startupId}`);
};

export const getInvestorMatchExplanation = async (startupId) => {
  return apiClient(`/ai/investor-match-explanation/${startupId}`, {
    method: 'POST',
  });
};
