import apiClient from './client';

export const getMyStartups = async () => {
  return await apiClient('/startups/my', { method: 'GET' });
};

export const getStartupById = async (id) => {
  return await apiClient(`/startups/${id}`, { method: 'GET' });
};

export const createStartup = async (startupData) => {
  const payload = {
    name: startupData.name,
    tagline: startupData.tagline,
    problemStatement: startupData.problemStatement,
    solution: startupData.solution,
    industry: startupData.industry,
    stage: startupData.stage,
    description: startupData.description || '',
  };
  return await apiClient('/startups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateStartup = async (id, startupData) => {
  const payload = {
    name: startupData.name,
    tagline: startupData.tagline,
    problemStatement: startupData.problemStatement,
    solution: startupData.solution,
    industry: startupData.industry,
    stage: startupData.stage,
    description: startupData.description || '',
  };
  return await apiClient(`/startups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const deleteStartup = async (id) => {
  return await apiClient(`/startups/${id}`, {
    method: 'DELETE',
  });
};
