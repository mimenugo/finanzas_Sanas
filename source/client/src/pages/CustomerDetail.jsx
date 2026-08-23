import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerService } from '@/services/customerService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Briefcase, 
  DollarSign, Calendar, TrendingUp, History, Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import CustomerModal from '@/components/customers/CustomerModal';
import DisbursementAccountsCard from '@/components/customers/DisbursementAccountsCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const canEdit = ['ADMIN', 'ANALISTA'].includes(user?.role);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const data = await customerService.getById(id);
      setCustomer(data);
    } catch (error) {
      toast.error('Error al cargar cliente');
      navigate('/clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchCustomer();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) return null;

  // Calcular estadísticas
  const totalLoans = customer.loans?.length || 0;
  const activeLoans = customer.loans?.filter(l => l.status === 'ACTIVE').length || 0;
  const totalBorrowed = customer.loans?.reduce((sum, loan) => sum + parseFloat(loan.amount), 0) || 0;
  const totalPending = customer.loans?.reduce((sum, loan) => sum + parseFloat(loan.balance), 0) || 0;

  // Datos para gráfico (últimas 6 cuentas)
  const chartData = customer.loans?.slice(0, 6).reverse().map((loan, index) => ({
    loan: `#${loan.id}`,
    monto: parseFloat(loan.amount),
    saldo: parseFloat(loan.balance)
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/clientes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {customer.firstName.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {customer.firstName} {customer.lastName}
              </h1>
              <p className="text-gray-600 mt-1">
                {customer.documentType}: {customer.documentNumber}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-lg font-semibold ${
            customer.status === 'ACTIVE'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {customer.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
          </span>
          {canEdit && (
            <Button onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Score Interno</p>
                <p className="text-3xl font-bold text-gray-900">{customer.internalScore}</p>
                <p className="text-sm text-gray-500">de 100</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Cuentas Totales</p>
                <p className="text-3xl font-bold text-gray-900">{totalLoans}</p>
                <p className="text-sm text-gray-500">{activeLoans} activos</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <History className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Saldo Administrado</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalBorrowed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                <p className="text-sm text-gray-600 mb-1">Saldo Pendiente</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Personal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="font-semibold text-gray-900">{customer.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">{customer.email || 'No registrado'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
                  <p className="font-semibold text-gray-900">
                    {customer.birthDate ? new Date(customer.birthDate).toLocaleDateString('es-ES') : 'No registrado'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Género</p>
                  <p className="font-semibold text-gray-900">
                    {customer.gender === 'M' ? 'Masculino' : customer.gender === 'F' ? 'Femenino' : 'Otro'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 md:col-span-2">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Dirección</p>
                  <p className="font-semibold text-gray-900">{customer.address || 'No registrado'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Laboral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Información Laboral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Empresa</p>
              <p className="font-semibold text-gray-900">{customer.company || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cargo</p>
              <p className="font-semibold text-gray-900">{customer.position || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ingresos Mensuales</p>
              <p className="text-xl font-bold text-gray-900">
                ${customer.monthlyIncome ? parseFloat(customer.monthlyIncome).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DisbursementAccountsCard
        customerId={customer.id}
        canManage={canEdit}
        isAdmin={user?.role === 'ADMIN'}
      />

      {/* Gráfico de Comportamiento */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comportamiento de Cuentas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="loan" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px' 
                  }}
                  formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                />
                <Line type="monotone" dataKey="monto" stroke="#2563eb" strokeWidth={2} name="Monto" />
                <Line type="monotone" dataKey="saldo" stroke="#ef4444" strokeWidth={2} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Historial de Cuentas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Cuentas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customer.loans && customer.loans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Monto</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Saldo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tasa</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Plazo</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cobrador</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customer.loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">#{loan.id}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        ${parseFloat(loan.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        ${parseFloat(loan.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{loan.interestRate}%</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{loan.term}</td>
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
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {loan.collector?.fullName || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">No hay cuentas registradas</p>
          )}
        </CardContent>
      </Card>

      {/* Referencia Personal */}
      {(customer.referenceName || customer.referencePhone) && (
        <Card>
          <CardHeader>
            <CardTitle>Referencia Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-semibold text-gray-900">{customer.referenceName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="font-semibold text-gray-900">{customer.referencePhone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Parentesco</p>
                <p className="font-semibold text-gray-900">{customer.referenceRelation || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={customer}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
