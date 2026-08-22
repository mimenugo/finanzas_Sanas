import { create } from 'zustand';
import { authService } from '../services/authService';

export const useAuthStore = create((set) => ({
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),
  
  login: async (email, password, rememberMe = false) => {
    const data = await authService.login(email, password);
    
    // Guardar tokens
    localStorage.setItem('accessToken', data.accessToken);
    
    if (rememberMe) {
      // Guardar refresh token solo si "recordar sesión" está activo
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('rememberMe', 'true');
    } else {
      // Usar sessionStorage para sesión temporal
      sessionStorage.setItem('refreshToken', data.refreshToken);
      localStorage.removeItem('rememberMe');
    }
    
    // Guardar usuario
    localStorage.setItem('user', JSON.stringify(data.user));
    
    set({ user: data.user, isAuthenticated: true });
    
    // Auto-refresh token antes de que expire
    scheduleTokenRefresh(rememberMe);
    
    return data;
  },

  logout: async () => {
    await authService.logout();
    
    // Limpiar todo
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('refreshToken');
    
    set({ user: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const data = await authService.refreshToken(refreshToken);
      localStorage.setItem('accessToken', data.accessToken);
      
      return data.accessToken;
    } catch (error) {
      // Si falla el refresh, hacer logout
      set({ user: null, isAuthenticated: false });
      localStorage.clear();
      sessionStorage.clear();
      throw error;
    }
  },

  setUser: (user) => set({ user }),
}));

// Función para programar refresh automático del token
function scheduleTokenRefresh(rememberMe) {
  // Access token expira en 15 minutos, refrescar a los 14 minutos
  const refreshTime = 14 * 60 * 1000; // 14 minutos
  
  setTimeout(async () => {
    try {
      const store = useAuthStore.getState();
      await store.refreshToken();
      
      // Reprogramar para el siguiente refresh
      scheduleTokenRefresh(rememberMe);
    } catch (error) {
      console.error('Auto refresh failed:', error);
    }
  }, refreshTime);
}

// Inicializar auto-refresh si hay sesión activa
if (authService.isAuthenticated()) {
  const rememberMe = localStorage.getItem('rememberMe') === 'true';
  scheduleTokenRefresh(rememberMe);
}