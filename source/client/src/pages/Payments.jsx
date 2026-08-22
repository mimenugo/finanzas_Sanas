import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '@/services/paymentService';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, ChevronLeft, ChevronRight, 
  DollarSign, Calendar, Download, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import VoidPaymentModal from '@/components/payments/VoidPaymentModal';

export default function Payments() {
  const { user } = useAuthStore();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ totalPayments: 0, monthPayments: 0, totalAmount: 0, monthAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [search, methodFilter, pagination.page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getAll({
        search,
        paymentMethod: methodFilter,
        page: pagination.page,
        limit: 10
      });
      setPayments(data.payments);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Error al cargar pagos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await paymentService.getStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleVoidPayment = (payment) => {
    setSelectedPayment(payment);
    setVoidModalOpen(true);
  };

  const handleDownloadReceipt = async (paymentId) => {
    try {
      await paymentService.downloadReceipt(paymentId);
      toast.success('Comprobante descargado');
    } catch (error) {
      toast.error('Error al descargar comprobante');
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const handleMethodFilter = (method) => {
    setMethodFilter(method === methodFilter ? '' : method);
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
        <p className="text-gray-600 mt-1">Historial completo de pagos recibidos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Pagos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPayments}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pagos Este Mes</p>
                <p className="text-3xl font-bold text-green-600">{stats.monthPayments}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Monto Total</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.totalAmount, settings)}
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
                <p className="text-sm font-medium text-gray-600 mb-1">Este Mes</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats.monthAmount, settings)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-yellow-600" />
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
                onClick={() => handleMethodFilter('CASH')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  methodFilter === 'CASH'
                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Efectivo
              </button>
              <button
                onClick={() => handleMethodFilter('TRANSFER')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  methodFilter === 'TRANSFER'
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Transferencia
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron pagos
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cuenta</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Monto</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Método</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cobrador</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Referencia</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((payment) => {
                      const isVoided = payment.observations?.includes('[ANULADO]');
                      
                      return (
                        <tr key={payment.id} className={`hover:bg-gray-50 transition-colors ${isVoided ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(payment.paymentDate, settings)}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {payment.loan.customer.firstName} {payment.loan.customer.lastName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {payment.loan.customer.documentNumber}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            <button
                              onClick={() => navigate(`/prestamos/${payment.loanId}`)}
                              className="text-primary hover:underline"
                            >
                              #{payment.loanId}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">
                            {formatCurrency(payment.amount, settings)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              payment.paymentMethod === 'CASH' ? 'bg-green-100 text-green-800' :
                              payment.paymentMethod === 'TRANSFER' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {payment.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.collector.fullName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {payment.reference || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleDownloadReceipt(payment.id)}
                                className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-300 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Comprobante
                              </button>
                              {isAdmin && !isVoided && (
                                <button
                                  onClick={() => handleVoidPayment(payment)}
                                  className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-300 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Anular
                                </button>
                              )}
                              {isAdmin && isVoided && (
                                <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg">
                                  Anulado
                                </span>
                              )}
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

      <VoidPaymentModal
        open={voidModalOpen}
        onClose={() => {
          setVoidModalOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onSuccess={fetchPayments}
      />
    </div>
  );
}
