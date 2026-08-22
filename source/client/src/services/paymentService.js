import api from './api';

export const paymentService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/payments', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/payments/${id}`);
    return data;
  },

  // ← ESTA FUNCIÓN YA EXISTE, ESTÁ BIEN
  create: async (paymentData) => {
    const { data } = await api.post('/payments', paymentData);
    return data;
  },

  // ← AGREGAR ESTA FUNCIÓN (para el preview del modal)
  previewPayment: async (loanId, amount) => {
    const { data } = await api.post(`/payments/preview/${loanId}`, { amount });
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/payments/stats');
    return data;
  },

  voidPayment: async (id, reason) => {
    const { data } = await api.post(`/payments/${id}/void`, { reason });
    return data;
  },

  downloadReceipt: async (id) => {
    const response = await api.get(`/payments/${id}/receipt`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `comprobante-pago-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};