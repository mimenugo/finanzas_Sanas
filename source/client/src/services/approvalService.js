import api from './api';

export const approvalService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/approvals', { params });
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/approvals/stats');
    return data;
  },

  approve: async (applicationId, approvalData) => {
    const { data } = await api.post(`/approvals/${applicationId}/approve`, approvalData);
    return data;
  },

  reject: async (applicationId, rejectionData) => {
    const { data } = await api.post(`/approvals/${applicationId}/reject`, rejectionData);
    return data;
  }
};