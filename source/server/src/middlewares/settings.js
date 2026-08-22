import prisma from '../config/database.js';

// Cache global
let settingsCache = null;
let cacheTime = null;
const CACHE_DURATION = 1 * 60 * 1000; // 1 minuto (más reactivo)

// Cargar settings desde BD
const loadSettings = async () => {
  const now = Date.now();
  
  // Usar cache si está fresco
  if (settingsCache && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    return settingsCache;
  }

  const settings = await prisma.settings.findMany();
  
  const parsed = settings.reduce((acc, setting) => {
    let value = setting.value;
    
    // Intentar parsear JSON
    try {
      value = JSON.parse(value);
    } catch (e) {
      // Mantener como string
    }
    
    acc[setting.key] = value;
    return acc;
  }, {});

  settingsCache = parsed;
  cacheTime = now;
  
  return parsed;
};

// Middleware para inyectar settings en req
export const injectSettings = async (req, res, next) => {
  try {
    req.settings = await loadSettings();
    next();
  } catch (error) {
    console.error('Error loading settings:', error);
    // Continuar con settings vacío en lugar de fallar
    req.settings = {};
    next();
  }
};


export const clearSettingsCache = () => {
  settingsCache = null;
  cacheTime = null;
  console.log('Settings cache cleared');
};

export const getSettings = async () => {
  return await loadSettings();
};