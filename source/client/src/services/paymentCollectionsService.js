import api from './api';
import axios from 'axios';
import { API_BASE_URL } from '@/config/apiConfig';

const baseURL = API_BASE_URL;

export const paymentCollectionsService = {
  dashboard: async () => {
    const { data } = await api.get('/payment-collections/dashboard');
    return data;
  },

  config: async () => {
    const { data } = await api.get('/payment-collections/config');
    return data;
  },

  saveSettings: async (payload) => {
    const { data } = await api.put('/payment-collections/settings', payload);
    return data;
  },

  saveMethod: async (payload) => {
    const { data } = await api.post('/payment-collections/methods', payload);
    return data;
  },

  saveBankAccount: async (payload) => {
    const { data } = await api.post('/payment-collections/bank-accounts', payload);
    return data;
  },

  saveProvider: async (payload) => {
    const { data } = await api.post('/payment-collections/providers', payload);
    return data;
  },

  generateReference: async (payload) => {
    const { data } = await api.post('/payment-collections/references', payload);
    return data;
  },

  clientPortal: async (documentNumber) => {
    const { data } = await axios.get(`${baseURL}/payment-collections/client/${documentNumber}`);
    return data;
  },

  clientPortalByPhoneLoan: async ({ phone, loanId }) => {
    const accessToken = sessionStorage.getItem(`clientPortalToken:${phone}:${loanId}`) || '';
    const params = new URLSearchParams({ phone, loanId, accessToken });
    const { data } = await axios.get(`${baseURL}/payment-collections/client-portal?${params.toString()}`);
    return data;
  },

  requestClientPortalCode: async ({ phone, loanId }) => {
    const { data } = await axios.post(`${baseURL}/payment-collections/client-portal/request-code`, { phone, loanId });
    return data;
  },

  verifyClientPortalCode: async ({ phone, loanId, code }) => {
    const { data } = await axios.post(`${baseURL}/payment-collections/client-portal/verify-code`, { phone, loanId, code });
    if (data.accessToken) {
      sessionStorage.setItem(`clientPortalToken:${phone}:${loanId}`, data.accessToken);
    }
    return data;
  },

  createStripeCheckout: async (payload) => {
    const accessToken = payload.phone && payload.loanId
      ? sessionStorage.getItem(`clientPortalToken:${payload.phone}:${payload.loanId}`)
      : '';
    const { data } = await axios.post(`${baseURL}/payment-collections/client/stripe-checkout`, { ...payload, accessToken });
    return data;
  },
};
