const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('sprintfounders_token');

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let body = options.body;
  if (body !== undefined && body !== null) {
    if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
      body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      body,
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
          errorMessage = 'Please log in again.';
          try {
            localStorage.removeItem('sprintfounders_token');
            localStorage.removeItem('sprintfounders_user');
          } catch (e) {}
          break;
        case 403:
          errorMessage = "You don't have permission to access this startup's finances.";
          break;
        case 404:
          errorMessage = 'Startup not found.';
          break;
        case 500:
          errorMessage = 'Unable to load financial data. Please try again.';
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
