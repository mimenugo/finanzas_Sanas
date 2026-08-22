import axios from 'axios';
import { API_BASE_URL } from '@/config/apiConfig';

const baseURL = API_BASE_URL;

export const publicRegistrationService = {
  get: async (token) => {
    const { data } = await axios.get(`${baseURL}/registration/${token}`);
    return data;
  },

  saveProgress: async (token, progress) => {
    const { data } = await axios.patch(`${baseURL}/registration/${token}/progress`, progress);
    return data;
  },

  submit: async (token, payload) => {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    const { data } = await axios.post(`${baseURL}/registration/${token}/submit`, formData);
    return data;
  },
};
