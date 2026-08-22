import api from './api';

export const collectionService = {
  getStats: async () => {
    const { data } = await api.get('/collections/stats');
    return data;
  },

  getOverdueLoans: async (params = {}) => {
    const { data } = await api.get('/collections/overdue', { params });
    return data;
  },

  createLog: async (logData) => {
    const { data } = await api.post('/collections/logs', logData);
    return data;
  },

  getLogs: async (loanId) => {
    const { data } = await api.get(`/collections/logs/${loanId}`);
    return data;
  }
};