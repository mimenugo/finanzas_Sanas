import api from './api';

export const reportService = {
  getPortfolio: async (params) => {
    const { data } = await api.get('/reports/portfolio', { params });
    return data;
  },

  getIncome: async (params) => {
    const { data } = await api.get('/reports/income', { params });
    return data;
  },

  getDisbursements: async (params) => {
    const { data } = await api.get('/reports/disbursements', { params });
    return data;
  },

  getOverdue: async (params) => {
    const { data } = await api.get('/reports/overdue', { params });
    return data;
  },

  getCollectorPerformance: async (params) => {
    const { data } = await api.get('/reports/collector-performance', { params });
    return data;
  },

  getCustomers: async (params) => {
    const { data } = await api.get('/reports/customers', { params });
    return data;
  },

  getAudit: async (params) => {
    const { data } = await api.get('/reports/audit', { params });
    return data;
  }
};