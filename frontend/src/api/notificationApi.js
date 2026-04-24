import api from './authApi';

export const getNotifications = () => api.get('/notifications');
export const getUnreadNotifications = () => api.get('/notifications/unread');
export const getUnreadCount = () => api.get('/notifications/unread/count');
export const markAsRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllAsRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const clearAllNotifications = () => api.delete('/notifications/clear');
