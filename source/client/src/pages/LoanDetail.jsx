import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loanService } from '@/services/loanService';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { FREQUENCY } from '@/constants';
import VoidPaymentModal from '@/components/payments/VoidPaymentModal';
import { useAuthStore } from '@/store/authStore';
import PaymentModal from '@/components/payments/PaymentModal';
import CollectionModal from '../components/collections/CollectionModal';

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { settings } = useSettings();
  const isAdmin = user?.role === 'ADMIN';
  
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [voidPaymentModalOpen, setVoidPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    fetchLoan();
  }, [id]);

  const fetchLoan = async () => {
    try {
      setLoading(true);
      const data = await loanService.getById(id);
      setLoan(data);
    } catch (error) {
      toast.error('Error al cargar cuenta');
      navigate('/prestamos');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    fetchLoan();
  };

  const handleVoidPayment = (payment) => {
    setSelectedPayment(payment);
    setVoidPaymentModalOpen(true);
  };

  const handleDownloadContract = async () => {
    try {
      await loanService.downloadContract(loan.id);
      toast.success('Contrato descargado exitosamente');
    } catch (error) {
      toast.error('Error al descargar contrato');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!loan) return null;

  const paidInstallments = loan.installments.filter(i => i.status === 'PAID').length;
  const overdueInstallments = loan.installments.filter(i => i.status === 'OVERDUE').length;

  const realBalance = loan.installments
    .filter(i => i.status !== 'PAID')
    .reduce((sum, i) => {
      const base = parseFloat(i.total);
      const mora = parseFloat(i.lateFee || 0);
      return sum + base + mora;
    }, 0);

  const totalPaid = loan.installments
    .filter(i => i.status === 'PAID')
    .reduce((sum, i) => sum + parseFloat(i.paidAmount || i.total), 0);

  const totalOverdueAmount = loan.installments
    .filter(i => i.status === 'OVERDUE')
    .reduce((sum, i) => {
      const base = parseFloat(i.total);
      const mora = parseFloat(i.lateFee || 0);
      return sum + base + mora;
    }, 0);

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800 border-green-300',
    PAID: 'bg-blue-100 text-blue-800 border-blue-300',
    DEFAULTED: 'bg-red-100 text-red-800 border-red-300'
  };

  const installmentStatusColors = {
    PAID: 'bg-green-50 border-l-4 border-green-500',
    PENDING: 'bg-yellow-50 border-l-4 border-yellow-500',
    OVERDUE: 'bg-red-50 border-l-4 border-red-500'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/prestamos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cuenta #{loan.id}</h1>
            <p className="text-gray-600 mt-1">
              Activada el {formatDate(loan.disbursementDate, settings)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={handleDownloadContract}
          >
            <FileText className="w-4 h-4 mr-2" />
            Descargar Contrato
          </Button>
          <span className={`px-4 py-2 rounded-lg font-semibold border-2 ${statusColors[loan.status]}`}>
            {loan.status === 'ACTIVE' && 'Activo'}
            {loan.status === 'PAID' && 'Pagado'}
            {loan.status === 'DEFAULTED' && 'En Mora'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monto de Cuenta</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(loan.amount, settings)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo Pendiente</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(realBalance, settings)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Incluye intereses y mora
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cuotas Pagadas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {paidInstallments}/{loan.term}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cuotas Vencidas</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {overdueInstallments}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(totalOverdueAmount, settings)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre:</span>
              <span className="font-semibold">
                {loan.customer.firstName} {loan.customer.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Documento:</span>
              <span className="font-semibold">{loan.customer.documentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teléfono:</span>
              <span className="font-semibold">{loan.customer.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-semibold">{loan.customer.email || 'No registrado'}</span>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate(`/clientes/${loan.customer.id}`)}
            >
              Ver Perfil Completo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalles de la Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Tasa de Interés:</span>
              <span className="font-semibold">{loan.interestRate}% anual</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Plazo:</span>
              <span className="font-semibold">{loan.term} cuotas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Frecuencia:</span>
              <span className="font-semibold">{FREQUENCY[loan.frequency]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cobrador:</span>
              <span className="font-semibold">{loan.collector.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Método de entrega:</span>
              <span className="font-semibold">{loan.disbursementMethod}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Cronograma de Pagos
            </CardTitle>
            <Button onClick={() => setPaymentModalOpen(true)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loan.installments.map((installment) => {
              const isOverdue = installment.status === 'OVERDUE';
              const isPaid = installment.status === 'PAID';
              const isPending = installment.status === 'PENDING';

              return (
                <div 
                  key={installment.id}
                  className={`p-4 rounded-lg ${installmentStatusColors[installment.status]}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                    <div>
                      <p className="text-xs text-gray-600">Cuota</p>
                      <p className="font-bold text-gray-900">#{installment.installmentNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Fecha Vencimiento</p>
                      <p className="font-semibold text-gray-900">
                        {formatDate(installment.dueDate, settings)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Capital</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(installment.principal, settings)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Interés</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(installment.interest, settings)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="font-bold text-gray-900">
                        {formatCurrency(installment.total, settings)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total + Mora</p>
                      <p className={`font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(installment.totalWithLateFee || installment.total, settings)}
                      </p>
                      {isOverdue && parseFloat(installment.lateFee) > 0 && (
                        <p className="text-xs text-red-500">
                          +{formatCurrency(installment.lateFee, settings)} mora
                        </p>
                      )}  
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isPaid ? 'bg-green-200 text-green-800' :
                        isPending ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {isPaid && 'Pagada'}
                        {isPending && 'Pendiente'}
                        {isOverdue && 'Vencida'}
                      </span>
                      {(isPending || isOverdue) && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setPaymentModalOpen(true)}
                        >
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t-2 border-gray-300">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                <div className="md:col-span-2">
                  <p className="text-sm font-bold text-gray-900">TOTALES PENDIENTES</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Capital Total</p>
                  <p className="font-bold text-gray-900">
                    {formatCurrency(
                      loan.installments
                        .filter(i => i.status !== 'PAID')
                        .reduce((sum, i) => sum + parseFloat(i.principal), 0),
                      settings
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Interés Total</p>
                  <p className="font-bold text-gray-900">
                    {formatCurrency(
                      loan.installments
                        .filter(i => i.status !== 'PAID')
                        .reduce((sum, i) => sum + parseFloat(i.interest), 0),
                      settings
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Mora Total</p>
                  <p className="font-bold text-red-600">
                    {formatCurrency(
                      loan.installments
                        .filter(i => i.status !== 'PAID')
                        .reduce((sum, i) => sum + parseFloat(i.lateFee || 0), 0),
                      settings
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-bold">TOTAL A PAGAR</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(realBalance, settings)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loan.payments && loan.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Monto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Método</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cobrador</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Referencia</th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loan.payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(payment.paymentDate, settings)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount, settings)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{payment.paymentMethod}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {payment.collector.fullName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {payment.reference || '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {!payment.observations?.includes('[ANULADO]') ? (
                              <button
                                onClick={() => handleVoidPayment(payment)}
                                className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-300 rounded-lg transition-colors"
                              >
                                Anular
                              </button>
                            ) : (
                              <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg">
                                Anulado
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    
      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        loan={loan}
        onSuccess={handlePaymentSuccess}
      />

      <VoidPaymentModal
        open={voidPaymentModalOpen}
        onClose={() => {
          setVoidPaymentModalOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
