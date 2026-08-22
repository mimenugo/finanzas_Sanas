import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
