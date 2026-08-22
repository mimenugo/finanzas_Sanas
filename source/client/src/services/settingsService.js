import api from './api';

export const settingsService = {
  // Get all settings
  getAll: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  // Update settings
  update: async (settings) => {
    const response = await api.patch('/settings', settings);
    return response.data;
  },

  // Upload logo
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await api.post('/settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Test SMTP
  testSmtp: async (config) => {
    const response = await api.post('/settings/smtp/test', config);
    return response.data;
  },

  // Google Sheets
  saveGoogleSheets: async (config) => {
    const response = await api.post('/settings/google-sheets/config', config);
    return response.data;
  },

  getGoogleSheetsAuthUrl: async () => {
    const response = await api.get('/settings/google-sheets/auth-url');
    return response.data;
  },

  testGoogleSheets: async () => {
    const response = await api.post('/settings/google-sheets/test');
    return response.data;
  },

  importGoogleSheetPayments: async () => {
    const response = await api.post('/settings/google-sheets/import-payments');
    return response.data;
  },

  downloadPaymentsTemplate: async () => {
    const response = await api.get('/settings/google-sheets/template/payments', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Backups
  generateBackup: async () => {
    const response = await api.post('/settings/backup/generate');
    return response.data;
  },

  listBackups: async () => {
    const response = await api.get('/settings/backup/list');
    return response.data;
  },

  deleteBackup: async (fileName) => {
    const response = await api.delete(`/settings/backup/${fileName}`);
    return response.data;
  },
};
