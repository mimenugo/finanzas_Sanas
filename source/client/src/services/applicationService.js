import api from './api';

export const applicationService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/applications', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/applications/${id}`);
    return data;
  },

  create: async (applicationData) => {
    const { data } = await api.post('/applications', applicationData);
    return data;
  },

  update: async (id, applicationData) => {
    const { data } = await api.put(`/applications/${id}`, applicationData);
    return data;
  },

  assignAnalyst: async (id, analystId) => {
    const { data } = await api.patch(`/applications/${id}/assign`, { analystId });
    return data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/applications/${id}`);
    return data;
  }
};