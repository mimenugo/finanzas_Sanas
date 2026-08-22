import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '@/services/customerService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search, Plus, Edit, Power, Eye, Phone, Mail,
  ChevronLeft, ChevronRight, Link, UserPlus, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import CustomerModal from '@/components/customers/CustomerModal';
import RegistrationLinkModal from '@/components/customers/RegistrationLinkModal';
import { useAuthStore } from '@/store/authStore';

export default function Customers() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const canEdit = ['ADMIN', 'ANALISTA'].includes(user?.role);

  useEffect(() => {
    fetchCustomers();
  }, [search, pagination.page]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getAll({
        search,
        page: pagination.page,
        limit: 10
      });
      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Error al cargar clientes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setModalOpen(true);
    setCreateMenuOpen(false);
  };

  const handleCreateLink = () => {
    setLinkModalOpen(true);
    setCreateMenuOpen(false);
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
  };

  const handleToggleStatus = async (customer) => {
    try {
      await customerService.toggleStatus(customer.id);
      toast.success(`Cliente ${customer.status === 'ACTIVE' ? 'desactivado' : 'activado'}`);
      fetchCustomers();
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  const handleRegistrationDecision = async (customer, decision) => {
    try {
      await customerService.decideRegistration(customer.id, { decision });
      toast.success(decision === 'APPROVED' ? 'Registro aprobado' : 'Registro rechazado');
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo actualizar el registro');
    }
  };

  const handleViewDetail = (customerId) => {
    navigate(`/clientes/${customerId}`);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  const badgeClass = (value) => {
    if (['APPROVED', 'ACTIVE'].includes(value)) return 'bg-green-100 text-green-800';
    if (['REJECTED', 'INACTIVE'].includes(value)) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gestiona la informacion de tus clientes</p>
        </div>
        {canEdit && (
          <div className="relative">
            <Button onClick={() => setCreateMenuOpen((value) => !value)} className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nuevo Cliente
            </Button>
            {createMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border bg-white p-2 shadow-lg">
                <button
                  onClick={handleCreate}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <UserPlus className="h-4 w-4 text-primary" />
                  Registro por administrador
                </button>
                <button
                  onClick={handleCreateLink}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <Link className="h-4 w-4 text-primary" />
                  Solicitar registro al cliente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, documento, telefono o email..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Clientes ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No se encontraron clientes</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Documento</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contacto</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cuentas</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registro</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                              {customer.photo ? (
                                <img src={`http://localhost:5000${customer.photo}`} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="font-semibold text-primary">{customer.firstName.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{customer.firstName} {customer.lastName}</p>
                              <p className="text-sm text-gray-500">{customer.email || 'Sin email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{customer.documentType}</p>
                          <p className="text-sm text-gray-500">{customer.documentNumber}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <Phone className="w-4 h-4" />
                              {customer.phone}
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Mail className="w-4 h-4" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {customer._count?.loans || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${badgeClass(customer.status)}`}>
                            {customer.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass(customer.registrationStatus || 'APPROVED')}`}>
                              {customer.registrationStatus || 'APPROVED'}
                            </span>
                            <p className="text-xs text-gray-500">Bio: {customer.biometricStatus || 'PENDING'}</p>
                            {customer.registeredAt && (
                              <p className="text-xs text-gray-400">{new Date(customer.registeredAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetail(customer.id)}
                              className="p-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canEdit && (
                              <>
                                {customer.registrationStatus === 'PENDING_REVIEW' && (
                                  <>
                                    <button
                                      onClick={() => handleRegistrationDecision(customer, 'APPROVED')}
                                      className="p-2 text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Aprobar registro"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleRegistrationDecision(customer, 'REJECTED')}
                                      className="p-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Rechazar registro"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleEdit(customer)}
                                  className="p-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(customer)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    customer.status === 'ACTIVE'
                                      ? 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                                      : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                                  }`}
                                  title={customer.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600">Pagina {pagination.page} de {pagination.pages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page === pagination.pages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={selectedCustomer}
        onSuccess={fetchCustomers}
      />
      <RegistrationLinkModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
      />
    </div>
  );
}
