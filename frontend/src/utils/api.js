import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updatePreferences: (data) => api.patch('/auth/preferences', data)
};

// Station endpoints
export const stationAPI = {
  getAll: () => api.get('/stations'),
  getCurrent: () => api.get('/stations/current'),
  getById: (id) => api.get(`/stations/${id}`),
  getSchedule: () => api.get('/stations/schedule/upcoming')
};

// Forecast endpoints
export const forecastAPI = {
  getStatus: () => api.get('/forecasts/status'),
  submit: (data) => api.post('/forecasts', data),
  getHistory: (params) => api.get('/forecasts/my-history', { params }),
  getToday: () => api.get('/forecasts/today')
};

// Leaderboard endpoints
export const leaderboardAPI = {
  get: (params) => api.get('/leaderboard', { params }),
  getStats: () => api.get('/leaderboard/stats')
};

// Score endpoints
export const scoreAPI = {
  getMyScores: (params) => api.get('/scores/my-scores', { params }),
  getByDate: (date) => api.get(`/scores/date/${date}`)
};

export default api;
