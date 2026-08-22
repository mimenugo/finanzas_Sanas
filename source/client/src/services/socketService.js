import { io } from 'socket.io-client';
import { API_BASE_URL, SERVER_BASE_URL } from '@/config/apiConfig';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(userId) {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    // Determinar URL base correctamente
    const socketUrl = API_BASE_URL.endsWith('/api') ? SERVER_BASE_URL : API_BASE_URL.replace(/\/api$/, '');

    this.socket = io(socketUrl, {
      transports: ['polling', 'websocket'], // Intentar polling primero
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to server');
      this.connected = true;
      
      // Autenticar usuario
      if (userId) {
        this.socket.emit('authenticate', userId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket] Reconnection attempt ${attempt}`);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('[Socket] Disconnected manually');
    }
  }

  onNotification(callback) {
    if (this.socket) {
      this.socket.on('new-notification', callback);
    }
  }

  offNotification(callback) {
    if (this.socket) {
      this.socket.off('new-notification', callback);
    }
  }

  isConnected() {
    return this.connected;
  }
}

export default new SocketService();
