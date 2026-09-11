const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('sprintfounders_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new Error('Unable to connect to the server. Please check your internet connection.');
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    let errorMessage = data?.message;

    if (!errorMessage) {
      switch (response.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Your session has expired. Please log in again.';
          try {
            localStorage.removeItem('sprintfounders_token');
            localStorage.removeItem('sprintfounders_user');
          } catch (e) {}
          break;
        case 403:
          errorMessage = "You don't have permission to perform this action.";
          break;
        case 404:
          errorMessage = 'Startup not found.';
          break;
        case 500:
          errorMessage = 'Something went wrong. Please try again.';
          break;
        default:
          errorMessage = `Request failed with status ${response.status}`;
      }
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export default apiClient;
