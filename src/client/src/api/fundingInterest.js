import apiClient from './client';

export const expressFundingInterest = async (interestData) => {
  return apiClient('/funding-interest', {
    method: 'POST',
    body: JSON.stringify(interestData),
  });
};

export const getMyFundingInterests = async () => {
  return apiClient('/funding-interest/my');
};

export const getStartupFundingInterests = async (startupId) => {
  return apiClient(`/startups/${startupId}/funding-interest`);
};
