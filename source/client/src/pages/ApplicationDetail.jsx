import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationService } from '@/services/applicationService';
import { approvalService } from '@/services/approvalService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, User, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { FREQUENCY } from '@/constants';
import ApprovalModal from '@/components/approvals/ApprovalModal';
import RejectionModal from '@/components/approvals/RejectionModal';
import CreateLoanModal from '@/components/approvals/CreateLoanModal';

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [createLoanModalOpen, setCreateLoanModalOpen] = useState(false);

  const canApprove = ['ADMIN', 'ANALISTA'].includes(user?.role);
  const canCreateLoan = user?.role === 'ADMIN';

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const data = await applicationService.getById(id);
      setApplication(data);
    } catch (error) {
      toast.error('Error al cargar solicitud');
      navigate('/solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSuccess = () => {
    toast.success('Solicitud aprobada exitosamente');
    fetchApplication();
  };

  const handleRejectSuccess = () => {
    toast.success('Solicitud rechazada');
    fetchApplication();
  };

  const handleLoanCreated = () => {
    toast.success('Cuenta creada exitosamente');
    fetchApplication();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!application) return null;

  const isPending = application.status === 'PENDING';
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    APPROVED: 'bg-green-100 text-green-800 border-green-300',
    REJECTED: 'bg-red-100 text-red-800 border-red-300'
  };

  // Calcular capacidad de pago
  const monthlyIncome = parseFloat(application.customer.monthlyIncome || 0);
  const activeLoans = application.customer.loans?.filter(l => l.status === 'ACTIVE') || [];
  const totalActiveDebt = activeLoans.reduce((sum, loan) => sum + parseFloat(loan.balance), 0);
  const requestedAmount = parseFloat(application.requestedAmount);
  const estimatedMonthlyPayment = requestedAmount / application.term;
  const debtToIncomeRatio = monthlyIncome > 0 ? ((totalActiveDebt + estimatedMonthlyPayment) / monthlyIncome * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/solicitudes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Solicitud #{application.id}</h1>
            <p className="text-gray-600 mt-1">
              Creada el {new Date(application.createdAt).toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-lg font-semibold border-2 ${statusColors[application.status]}`}>
          {application.status === 'PENDING' && 'Pendiente'}
          {application.status === 'APPROVED' && 'Aprobada'}
          {application.status === 'REJECTED' && 'Rechazada'}
        </span>
      </div>

      {/* Actions */}
      {isPending && canApprove && (
        <div className="flex gap-3">
          <Button onClick={() => setApprovalModalOpen(true)} className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Aprobar Solicitud
          </Button>
          <Button variant="outline" onClick={() => setRejectionModalOpen(true)} className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50">
            <XCircle className="w-5 h-5" />
            Rechazar Solicitud
          </Button>
        </div>
      )}

      {/* Crear cuenta si está aprobada y no tiene cuenta */}
      {application.status === 'APPROVED' && !application.loan && canCreateLoan && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-900">Solicitud Aprobada</h3>
              <p className="text-sm text-green-700 mt-1">
                La solicitud ha sido aprobada. Ahora puedes crear la cuenta y activar el calendario de pagos.
              </p>
            </div>
            <Button onClick={() => setCreateLoanModalOpen(true)} className="bg-green-600 hover:bg-green-700">
              <DollarSign className="w-5 h-5 mr-2" />
              Crear Cuenta
            </Button>
          </div>
        </div>
      )}

      {/* Cuenta ya creada */}
      {application.loan && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Cuenta Creada</h3>
              <p className="text-sm text-blue-700 mt-1">
                La cuenta #{application.loan.id} ha sido creada exitosamente.
              </p>
            </div>
            <Button onClick={() => navigate(`/prestamos/${application.loan.id}`)} variant="outline">
              Ver Cuenta
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del Cliente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nombre Completo</p>
                <p className="font-semibold text-gray-900">
                  {application.customer.firstName} {application.customer.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Documento</p>
                <p className="font-semibold text-gray-900">{application.customer.documentNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-semibold text-gray-900">{application.customer.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">{application.customer.email || 'No registrado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ingresos Mensuales</p>
                <p className="font-semibold text-gray-900">
                  ${monthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Score Interno</p>
                <p className="font-semibold text-gray-900">{application.customer.internalScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacidad de Pago */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Capacidad de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Ratio Deuda/Ingreso</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      debtToIncomeRatio < 30 ? 'bg-green-500' : 
                      debtToIncomeRatio < 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(debtToIncomeRatio, 100)}%` }}
                  />
                </div>
                <span className="font-bold text-gray-900">{debtToIncomeRatio.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cuentas Activas</p>
              <p className="font-semibold text-gray-900">{activeLoans.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Deuda Total Activa</p>
              <p className="font-semibold text-gray-900">
                ${totalActiveDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cuota Estimada</p>
              <p className="font-semibold text-gray-900">
                ${estimatedMonthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalles de la Solicitud */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Detalles de la Solicitud
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Monto Solicitado</p>
              <p className="text-2xl font-bold text-gray-900">
                ${parseFloat(application.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Plazo</p>
              <p className="text-2xl font-bold text-gray-900">{application.term}</p>
              <p className="text-sm text-gray-500">{FREQUENCY[application.frequency]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Frecuencia</p>
              <p className="text-xl font-bold text-gray-900">{FREQUENCY[application.frequency]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fecha de Solicitud</p>
              <p className="text-xl font-bold text-gray-900">
                {new Date(application.createdAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>

          {application.purpose && (
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-2">Motivo de la Solicitud</p>
              <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{application.purpose}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de cuentas */}
      {application.customer.loans && application.customer.loans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historial de Cuentas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Monto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Saldo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {application.customer.loans.map((loan) => (
                    <tr key={loan.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">#{loan.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        ${parseFloat(loan.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        ${parseFloat(loan.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          loan.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          loan.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(loan.disbursementDate).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ApprovalModal
        open={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        application={application}
        onSuccess={handleApproveSuccess}
      />

      <RejectionModal
        open={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        applicationId={application.id}
        onSuccess={handleRejectSuccess}
      />

      <CreateLoanModal
        open={createLoanModalOpen}
        onClose={() => setCreateLoanModalOpen(false)}
        application={application}
        onSuccess={handleLoanCreated}
      />
    </div>
  );
}
