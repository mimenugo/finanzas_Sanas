export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

export const CLIENT_BASE_URL =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:5174';

export const buildApiUrl = (path = '') => {
  const cleanPath = String(path).replace(/^\/+/, '');
  return `${API_BASE_URL}/${cleanPath}`;
};

export const buildServerUrl = (path = '') => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = String(path).replace(/^\/+/, '');
  return `${SERVER_BASE_URL}/${cleanPath}`;
};

export const buildClientUrl = (path = '') => {
  const cleanPath = String(path).replace(/^\/+/, '');
  return cleanPath ? `${CLIENT_BASE_URL}/${cleanPath}` : CLIENT_BASE_URL;
};
