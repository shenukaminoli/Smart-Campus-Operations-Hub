import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8081/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = (email, password) =>
  api.post('/auth/login', { email, password });

export const registerUser = (data) =>
  api.post('/auth/register', data);

export const getCurrentUser = () =>
  api.get('/auth/me');

export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export default api;
