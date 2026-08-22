import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loanService } from '@/services/loanService';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, Eye, ChevronLeft, ChevronRight, 
  DollarSign, TrendingUp, CheckCircle, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAID: 'bg-blue-100 text-blue-800',
  DEFAULTED: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  ACTIVE: 'Activo',
  PAID: 'Pagado',
  DEFAULTED: 'Mora'
};

export default function Loans() {
  const { user } = useAuthStore();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState({ totalActive: 0, totalPaid: 0, totalDefaulted: 0, totalDisbursed: 0, totalPending: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });

  useEffect(() => {
    fetchLoans();
    fetchStats();
  }, [search, statusFilter, pagination.page]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      
      const params = {
        search,
        page: pagination.page,
        limit: 10
      };
      
      if (statusFilter === 'DEFAULTED') {
        params.overdue = 'true';
      } else if (statusFilter) {
        params.status = statusFilter;
      }
      
      const data = await loanService.getAll(params);
      setLoans(data.loans);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Error al cargar cuentas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await loanService.getStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewDetail = (id) => {
    navigate(`/prestamos/${id}`);
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cuentas</h1>
        <p className="text-gray-600 mt-1">Gestiona las cuentas activas, calendarios de pago y seguimiento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Activos</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalActive}</p>
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
                <p className="text-sm font-medium text-gray-600 mb-1">Pagados</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalPaid}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">En Mora</p>
                <p className="text-3xl font-bold text-red-600">{stats.totalDefaulted}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Saldo Administrado</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.totalDisbursed, settings)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Pendiente</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.totalPending, settings)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
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

            <div className="flex gap-2">
              <button
                onClick={() => handleStatusFilter('ACTIVE')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Activos
              </button>
              <button
                onClick={() => handleStatusFilter('PAID')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'PAID'
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pagados
              </button>
              <button
                onClick={() => handleStatusFilter('DEFAULTED')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === 'DEFAULTED'
                    ? 'bg-red-100 text-red-800 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                En Mora
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Cuentas ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron cuentas
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Saldo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cuotas</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cobrador</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loans.map((loan) => {
                      const paidInstallments = loan._count?.paidInstallments || 0;
                      const totalInstallments = loan._count?.installments || 0;

                      return (
                        <tr 
                          key={loan.id}  
                          className={`hover:bg-gray-50 transition-colors ${
                            loan.hasOverdue ? 'bg-red-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            <div className="flex items-center gap-2">
                              #{loan.id}
                              {loan.hasOverdue && (
                                <AlertTriangle className="w-4 h-4 text-red-500" title="Tiene cuotas vencidas" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {loan.customer.firstName} {loan.customer.lastName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {loan.customer.documentNumber}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {formatCurrency(loan.amount, settings)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            {formatCurrency(loan.balance, settings)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium text-gray-900">
                              {paidInstallments}/{totalInstallments}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {loan.collector?.fullName}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${STATUS_COLORS[loan.status]}`}>
                              {STATUS_LABELS[loan.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewDetail(loan.id)}
                                className="p-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver detalle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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
