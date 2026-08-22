import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import socketService from '../services/socketService';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (limit = 10) => {
    try {
      set({ loading: true });
      const data = await notificationService.getAll({ limit });
      set({ 
        notifications: data.notifications, 
        unreadCount: data.unreadCount,
        loading: false 
      });
    } catch (error) {
      console.error('Fetch notifications error:', error);
      set({ loading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationService.markAsRead(id);
      
      // Actualizar localmente
      const { notifications, unreadCount } = get();
      const updated = notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      
      set({ 
        notifications: updated,
        unreadCount: Math.max(0, unreadCount - 1)
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Actualizar localmente
      const { notifications } = get();
      const updated = notifications.map(n => ({ ...n, read: true }));
      
      set({ 
        notifications: updated,
        unreadCount: 0
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  },

  addNotification: (notification) => {
    const { notifications, unreadCount } = get();
    set({
      notifications: [notification, ...notifications],
      unreadCount: unreadCount + 1
    });
  },

  // Inicializar WebSocket
  initializeSocket: (userId) => {
    socketService.connect(userId);
    
    // Escuchar nuevas notificaciones
    socketService.onNotification((notification) => {
      console.log('[Store] New notification received:', notification);
      get().addNotification(notification);
    });
  },

  // Desconectar WebSocket
  disconnectSocket: () => {
    socketService.disconnect();
  }
}));