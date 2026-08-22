import { Bell, Check, CheckCheck, X, FileText, CheckCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  
  const { user } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, initializeSocket, disconnectSocket } = useNotificationStore();

  // Inicializar WebSocket y fetch inicial
  useEffect(() => {
    if (user?.id) {
      // Fetch inicial
      fetchNotifications();
      
      // Conectar WebSocket
      initializeSocket(user.id);
    }

    // Cleanup al desmontar
    return () => {
      disconnectSocket();
    };
  }, [user?.id, fetchNotifications, initializeSocket, disconnectSocket]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
    
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getNotificationIcon = (type) => {
    const iconConfig = {
      ASSIGNMENT: { icon: FileText, color: 'text-blue-400' },
      APPROVAL: { icon: CheckCircle, color: 'text-green-400' },
      PAYMENT: { icon: DollarSign, color: 'text-emerald-400' },
      OVERDUE: { icon: AlertTriangle, color: 'text-red-400' },
      DEFAULT: { icon: Bell, color: 'text-dark-400' }
    };
    
    return iconConfig[type] || iconConfig.DEFAULT;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-dark-400 hover:text-white hover:bg-dark-700/50 rounded-lg transition-all duration-200"
      >
        <Bell className="w-5 h-5" />
        
        {/* Badge contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-dark-800 border border-dark-700 rounded-lg shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <p className="text-dark-400 text-xs mt-0.5">
                  {unreadCount} sin leer
                </p>
              )}
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-primary-400 hover:text-primary-300 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-transparent">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-400 text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-700">
                {notifications.map((notification) => {
                  const { icon: Icon, color } = getNotificationIcon(notification.type);
                  
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-4 text-left hover:bg-dark-700/50 transition-colors ${
                        !notification.read ? 'bg-dark-700/30' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icono profesional */}
                        <div className="flex-shrink-0">
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`text-sm font-medium ${
                              notification.read ? 'text-dark-300' : 'text-white'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                          
                          <p className="text-dark-400 text-xs mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <p className="text-dark-500 text-xs">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: es
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-dark-700 bg-dark-900/50">
              <button
                onClick={() => {
                  navigate('/notificaciones');
                  setIsOpen(false);
                }}
                className="w-full text-center text-primary-400 hover:text-primary-300 text-xs font-medium transition-colors uppercase tracking-wider"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}