import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/notificationStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, Search, Filter, CheckCheck, Trash2,
  FileText, CheckCircle, DollarSign, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' = todas, 'unread' = no leídas
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      await fetchNotifications(100); // Cargar más para paginación local
    } catch (error) {
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar notificaciones
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(search.toLowerCase()) ||
      notification.message.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = !typeFilter || notification.type === typeFilter;
    const matchesStatus = !statusFilter || (statusFilter === 'unread' && !notification.read);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Paginación
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  // Estadísticas por tipo
  const statsByType = {
    ASSIGNMENT: notifications.filter(n => n.type === 'ASSIGNMENT' && !n.read).length,
    APPROVAL: notifications.filter(n => n.type === 'APPROVAL' && !n.read).length,
    PAYMENT: notifications.filter(n => n.type === 'PAYMENT' && !n.read).length,
    OVERDUE: notifications.filter(n => n.type === 'OVERDUE' && !n.read).length,
  };

  const getNotificationIcon = (type) => {
    const iconConfig = {
      ASSIGNMENT: { icon: FileText, color: 'text-blue-500 bg-blue-100' },
      APPROVAL: { icon: CheckCircle, color: 'text-green-500 bg-green-100' },
      PAYMENT: { icon: DollarSign, color: 'text-emerald-500 bg-emerald-100' },
      OVERDUE: { icon: AlertTriangle, color: 'text-red-500 bg-red-100' },
      DEFAULT: { icon: Bell, color: 'text-gray-500 bg-gray-100' }
    };
    
    return iconConfig[type] || iconConfig.DEFAULT;
  };

  const getTypeLabel = (type) => {
    const labels = {
      ASSIGNMENT: 'Asignación',
      APPROVAL: 'Aprobación',
      PAYMENT: 'Pago',
      OVERDUE: 'Mora'
    };
    return labels[type] || type;
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      toast.error('Error al marcar notificaciones');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'No tienes notificaciones pendientes'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
                <p className="text-3xl font-bold text-gray-900">{notifications.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Asignaciones</p>
                <p className="text-3xl font-bold text-blue-600">{statsByType.ASSIGNMENT}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Aprobaciones</p>
                <p className="text-3xl font-bold text-green-600">{statsByType.APPROVAL}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pagos</p>
                <p className="text-3xl font-bold text-emerald-600">{statsByType.PAYMENT}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en notificaciones..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTypeFilter('');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === ''
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => {
                  setTypeFilter('ASSIGNMENT');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'ASSIGNMENT'
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Asignaciones
              </button>
              <button
                onClick={() => {
                  setTypeFilter('APPROVAL');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'APPROVAL'
                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Aprobaciones
              </button>
              <button
                onClick={() => {
                  setTypeFilter('PAYMENT');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  typeFilter === 'PAYMENT'
                    ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pagos
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setStatusFilter('');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === ''
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => {
                  setStatusFilter('unread');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'unread'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                No leídas
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredNotifications.length} Notificaciones
            {(search || typeFilter || statusFilter) && ' (filtradas)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No hay notificaciones</p>
              {(search || typeFilter || statusFilter) && (
                <p className="text-gray-400 text-sm mt-2">Prueba cambiando los filtros</p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedNotifications.map((notification) => {
                  const { icon: Icon, color } = getNotificationIcon(notification.type);
                  
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                        notification.read
                          ? 'bg-white border-gray-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className={`font-semibold ${
                              notification.read ? 'text-gray-700' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                            )}
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className={`px-2 py-1 rounded ${color.replace('text-', 'bg-').replace('-500', '-100')} ${color}`}>
                              {getTypeLabel(notification.type)}
                            </span>
                            <span>
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: es
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600">
                    Página {page} de {totalPages} ({filteredNotifications.length} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}