import api from './authApi';

export const getAllUsers = () => api.get('/users');
export const getUsersByRole = (role) => api.get(`/users/role/${role}`);
export const getUserStats = () => api.get('/users/stats');
export const searchUsers = (query) => api.get('/users/search', { params: { query } });
export const updateUserRole = (id, role) => api.put(`/users/${id}/role`, { role });
export const deactivateUser = (id) => api.put(`/users/${id}/deactivate`);
export const activateUser = (id) => api.put(`/users/${id}/activate`);
export const deleteUser = (id) => api.delete(`/users/${id}`);
