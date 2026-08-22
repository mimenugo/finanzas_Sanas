import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationService } from '@/services/applicationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, Plus, Eye, ChevronLeft, ChevronRight, UserCog
} from 'lucide-react';
import { toast } from 'sonner';
import ApplicationModal from '@/components/applications/ApplicationModal';
import AssignAnalystModal from '@/components/applications/AssignAnalystModal';
import { useAuthStore } from '@/store/authStore';
import { FREQUENCY } from '@/constants';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada'
};

export default function Applications() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const canCreate = ['ADMIN', 'ANALISTA'].includes(user?.role);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchApplications();
  }, [search, statusFilter, pagination.page]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await applicationService.getAll({
        search,
        status: statusFilter,
        page: pagination.page,
        limit: 10
      });
      setApplications(data.applications);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Error al cargar solicitudes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalOpen(true);
  };

  const handleViewDetail = (id) => {
    navigate(`/solicitudes/${id}`);
  };

  const handleAssignAnalyst = (application) => {
    setSelectedApplication(application);
    setAssignModalOpen(true);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status === statusFilter ? '' : status);
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Solicitudes de Cuenta</h1>
          <p className="text-gray-600 mt-1">Gestiona las solicitudes de registro y acuerdos financieros</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nueva Solicitud
          </Button>
        )}
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
                placeholder="Buscar por cliente..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusFilter('PENDING')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pendientes
              </button>
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
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Solicitudes ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron solicitudes
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Monto</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Plazo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {applications.map((application) => (
                      <tr key={application.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          #{application.id}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {application.customer.firstName} {application.customer.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {application.customer.documentNumber}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          ${parseFloat(application.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {application.term} {FREQUENCY[application.frequency]}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(application.createdAt).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${STATUS_COLORS[application.status]}`}>
                            {STATUS_LABELS[application.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {isAdmin && application.status === 'PENDING' && (
                              <button
                                onClick={() => handleAssignAnalyst(application)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Asignar analista"
                              >
                                <UserCog className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleViewDetail(application.id)}
                              className="p-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalle"
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

      {/* Modals */}
      <ApplicationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchApplications}
      />

      <AssignAnalystModal
        open={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedApplication(null);
        }}
        application={selectedApplication}
        onSuccess={fetchApplications}
      />
    </div>
  );
}
