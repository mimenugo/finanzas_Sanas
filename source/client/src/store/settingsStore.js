import { create } from 'zustand';
import axios from 'axios';
import { API_BASE_URL } from '@/config/apiConfig';

const API_URL = API_BASE_URL;

export const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  loadPublicSettings: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get(`${API_URL}/settings/public`);
      set({ settings: response.data, loading: false });
      return response.data;
    } catch (error) {
      console.error('Error loading settings:', error);
      set({ 
        error: 'Error al cargar configuración', 
        loading: false 
      });
      return null;
    }
  },

  getSetting: (category, key, defaultValue = null) => {
    const { settings } = get();
    return settings?.[category]?.[key] ?? defaultValue;
  },

  getRates: () => {
    const { settings } = get();
    return settings?.rates || {};
  },

  getCompany: () => {
    const { settings } = get();
    return settings?.company || {};
  },

  getSystem: () => {
    const { settings } = get();
    return settings?.system || {};
  },

  getAvailableFrequencies: () => {
    const { settings } = get();
    const frequencies = settings?.rates?.rate_frequencies || ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];
    return Array.isArray(frequencies) ? frequencies : ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];
  },

  validateAmount: (amount) => {
    const { settings } = get();
    const min = parseFloat(settings?.rates?.loan_amount_min || 0);
    const max = parseFloat(settings?.rates?.loan_amount_max || Infinity);
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return { valid: false, message: 'El monto debe ser mayor a 0' };
    }

    if (min && amountNum < min) {
      return { valid: false, message: `El monto mínimo es $${min}` };
    }

    if (max && amountNum > max) {
      return { valid: false, message: `El monto máximo es $${max}` };
    }

    return { valid: true };
  },

  validateTerm: (term) => {
    const { settings } = get();
    const min = parseInt(settings?.rates?.loan_term_min || 1);
    const max = parseInt(settings?.rates?.loan_term_max || Infinity);
    const termNum = parseInt(term);

    if (isNaN(termNum) || termNum <= 0) {
      return { valid: false, message: 'El plazo debe ser mayor a 0' };
    }

    if (min && termNum < min) {
      return { valid: false, message: `El plazo mínimo es ${min} cuotas` };
    }

    if (max && termNum > max) {
      return { valid: false, message: `El plazo máximo es ${max} cuotas` };
    }

    return { valid: true };
  },
}));
