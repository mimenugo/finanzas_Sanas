import api from './api';

export const userService = {
  getAll: async (params) => {
    const { data } = await api.get('/users', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/users/stats');
    return data;
  },

  create: async (userData) => {
    const { data } = await api.post('/users', userData);
    return data;
  },

  update: async (id, userData) => {
    const { data } = await api.patch(`/users/${id}`, userData);
    return data;
  },

  changePassword: async (id, newPassword) => {
    const { data } = await api.patch(`/users/${id}/password`, { newPassword });
    return data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  }
};