import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalService } from '@/services/approvalService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight, 
  TrendingUp, TrendingDown, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { FREQUENCY } from '@/constants';

const STATUS_COLORS = {
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada'
};

export default function Approvals() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, pending: 0, approvalRate: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });

  const canView = ['ADMIN', 'ANALISTA', 'CONSULTA'].includes(user?.role);

  useEffect(() => {
    if (canView) {
      fetchApprovals();
      fetchStats();
    }
  }, [statusFilter, pagination.page]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const data = await approvalService.getAll({
        status: statusFilter,
        page: pagination.page,
        limit: 10
      });
      setApprovals(data.approvals);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Error al cargar aprobaciones');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await approvalService.getStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewDetail = (applicationId) => {
    navigate(`/solicitudes/${applicationId}`);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status === statusFilter ? '' : status);
    setPagination({ ...pagination, page: 1 });
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No tienes permisos para ver esta sección</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Aprobaciones</h1>
        <p className="text-gray-600 mt-1">Historial de decisiones sobre solicitudes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Aprobadas</p>
                <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
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
                <p className="text-sm font-medium text-gray-600 mb-1">Rechazadas</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pendientes</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Tasa Aprobación</p>
                <p className="text-3xl font-bold text-blue-600">{stats.approvalRate}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'APPROVED'
                  ? 'bg-green-100 text-green-800 border-2 border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Aprobadas
            </button>
            <button
              onClick={() => handleStatusFilter('REJECTED')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'REJECTED'
                  ? 'bg-red-100 text-red-800 border-2 border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rechazadas
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Aprobaciones ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron aprobaciones
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID Sol.</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Monto Aprobado</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tasa</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Plazo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Analista</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {approvals.map((approval) => (
                      <tr key={approval.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          #{approval.application.id}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {approval.application.customer.firstName} {approval.application.customer.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {approval.application.customer.documentNumber}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {approval.status === 'APPROVED' ? (
                            `$${parseFloat(approval.approvedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {approval.status === 'APPROVED' ? (
                            `${approval.interestRate}%`
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {approval.status === 'APPROVED' ? (
                            `${approval.term} ${FREQUENCY[approval.frequency]}`
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {approval.approver.fullName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(approval.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${STATUS_COLORS[approval.status]}`}>
                            {STATUS_LABELS[approval.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetail(approval.application.id)}
                              className="p-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver solicitud"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page === pagination.pages}
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