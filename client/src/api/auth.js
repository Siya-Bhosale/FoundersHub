import apiClient from './client';

export const registerUser = async ({ name, email, password, role }) => {
  return await apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
};

export const loginUser = async ({ email, password }) => {
  return await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const getMe = async () => {
  return await apiClient('/auth/me', {
    method: 'GET',
  });
};
