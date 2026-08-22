import api from './api';

export const notificationService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  markAsRead: async (id) => {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await api.patch('/notifications/read-all');
    return data;
  }
};