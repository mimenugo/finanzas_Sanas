import api from './api';

export const dashboardService = {
  getStats: async () => {
    const { data } = await api.get('/dashboard/stats');
    return data;
  }
};