import api from './api';

export const loanService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/loans', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/loans/${id}`);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/loans/stats');
    return data;
  },

  create: async (loanData) => {
    const { data } = await api.post('/loans', loanData);
    return data;
  },

  updateCollector: async (id, collectorId) => {
    const { data } = await api.patch(`/loans/${id}/collector`, { collectorId });
    return data;
  },
  
  downloadContract: async (id) => {
  const response = await api.get(`/loans/${id}/contract`, {
    responseType: 'blob'
  });
  
  // Crear link de descarga
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `contrato-cuenta-${id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
  
};

