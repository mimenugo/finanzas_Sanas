import api from './api';

const toCustomerPayload = (customerData) => {
  if (!customerData.documentFile && !customerData.addressProofFile && !customerData.photoFile) {
    return customerData;
  }

  const formData = new FormData();

  Object.entries(customerData).forEach(([key, value]) => {
    if (key === 'documentFile') {
      formData.append('documentFile', value);
      return;
    }

    if (key === 'addressProofFile') {
      formData.append('addressProofFile', value);
      return;
    }

    if (key === 'photoFile') {
      formData.append('photoFile', value);
      return;
    }

    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  return formData;
};

export const customerService = {
  getAll: async (params = {}) => {
    const { data } = await api.get('/customers', { params });
    return data;
  },

  getById: async (id) => {
    const { data } = await api.get(`/customers/${id}`);
    return data;
  },

  getCreditReferences: async (params = {}) => {
    const { data } = await api.get('/customers/credit-references', { params });
    return data;
  },

  getDisbursementAccounts: async (customerId) => {
    const { data } = await api.get(`/customers/${customerId}/disbursement-accounts`);
    return data;
  },

  createDisbursementAccount: async (customerId, payload) => {
    const { data } = await api.post(`/customers/${customerId}/disbursement-accounts`, payload);
    return data;
  },

  verifyDisbursementAccount: async (customerId, accountId, payload) => {
    const { data } = await api.patch(`/customers/${customerId}/disbursement-accounts/${accountId}/verification`, payload);
    return data;
  },

  setPrimaryDisbursementAccount: async (customerId, accountId) => {
    const { data } = await api.patch(`/customers/${customerId}/disbursement-accounts/${accountId}/primary`);
    return data;
  },

  createRegistrationLink: async (payload) => {
    const { data } = await api.post('/customers/registration-links', payload);
    return data;
  },

  getRegistrationRequests: async (params = {}) => {
    const { data } = await api.get('/customers/registration/requests', { params });
    return data;
  },

  decideRegistration: async (customerId, payload) => {
    const { data } = await api.patch(`/customers/${customerId}/registration-decision`, payload);
    return data;
  },

  create: async (customerData) => {
    const payload = toCustomerPayload(customerData);
    const { data } = await api.post('/customers', payload);
    return data;
  },

  update: async (id, customerData) => {
    const payload = toCustomerPayload(customerData);
    const { data } = await api.put(`/customers/${id}`, payload);
    return data;
  },

  toggleStatus: async (id) => {
    const { data } = await api.patch(`/customers/${id}/status`);
    return data;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/customers/${id}`);
    return data;
  }
};
