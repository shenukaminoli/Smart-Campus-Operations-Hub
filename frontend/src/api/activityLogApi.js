import api from './authApi';

export const getAllLogs = () => api.get('/activity-logs');
export const getLogsByUser = (userId) => api.get(`/activity-logs/user/${userId}`);
export const getLogsByAction = (action) => api.get(`/activity-logs/action/${action}`);
export const getRecentLogs = (limit = 50) => api.get(`/activity-logs/recent?limit=${limit}`);
