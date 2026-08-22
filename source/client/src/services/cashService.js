import api from './api';

export const cashService = {
  // Stats
  getStats: () => api.get('/cash/stats'),
  getCashFlow: () => api.get('/cash/flow'),

  // Cajas
  getCashes: () => api.get('/cash'),
  createCash: (data) => api.post('/cash', data),

  // Movimientos
  getCashMovements: (cashId, params) => api.get(`/cash/${cashId}/movements`, { params }),
  createMovement: (data) => api.post('/cash/movements', data),

  // Transferencias
  transferBetweenCashes: (data) => api.post('/cash/transfers', data),

  // Cierres
  closeCash: (data) => api.post('/cash/closures', data),
  getCashClosures: (cashId, params) => {
    if (cashId) {
      return api.get(`/cash/${cashId}/closures`, { params });
    }
    return api.get('/cash/closures', { params });
  }
};