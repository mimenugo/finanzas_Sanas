import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collectionService } from '@/services/collectionService';
import { useSettings } from '@/hooks/useSettings';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Calendar,
  Phone, 
  MessageSquare, 
  Mail, 
  ChevronLeft, 
  ChevronRight,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import CollectionModal from '@/components/collections/CollectionModal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const DAYS_FILTERS = [
  { value: '1-7', label: '1-7 días', color: 'yellow' },
  { value: '8-15', label: '8-15 días', color: 'orange' },
  { value: '16-30', label: '16-30 días', color: 'red' },
  { value: '31-999', label: '30+ días', color: 'red' }
];

const StatCard = ({ title, value, icon: Icon, colorClass, formatValue }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${colorClass}`}>
            {formatValue ? formatValue(value) : value}
          </p>
        </div>
        <div className={`w-12 h-12 ${colorClass.replace('text-', 'bg-').replace('600', '100')} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const FilterButton = ({ active, onClick, label, color }) => {
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    red: 'bg-red-100 text-red-800 border-red-300'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? `${colorClasses[color]} border-2`
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
};

const ContactActions = ({ customer, onLogClick }) => (
  <div className="flex flex-col gap-2 ml-4">
    <a
      href={`tel:${customer.phone}`}
      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
      title="Llamar"
    >
      <Phone className="w-4 h-4" />
    </a>
    <a
      href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
      title="WhatsApp"
    >
      <MessageSquare className="w-4 h-4" />
    </a>
    {customer.email && (
      <a
        href={`mailto:${customer.email}`}
        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
        title="Email"
      >
        <Mail className="w-4 h-4" />
      </a>
    )}
    <button
      onClick={onLogClick}
      className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
      title="Registrar Gestión"
    >
      <FileText className="w-4 h-4" />
    </button>
  </div>
);

const OverdueLoanItem = ({ loan, onLogClick, onViewLoan, settings }) => {
  const getDaysColor = (days) => {
    if (days <= 7) return 'text-yellow-600 bg-yellow-100';
    if (days <= 30) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {loan.customer.firstName} {loan.customer.lastName}
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDaysColor(loan.daysOverdue)}`}>
              {loan.daysOverdue} días de mora
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <span className="text-gray-600">Cuenta:</span>
              <p className="font-semibold">#{loan.id}</p>
            </div>
            <div>
              <span className="text-gray-600">Monto Vencido:</span>
              <p className="font-semibold text-red-600">
                {formatCurrency(loan.overdueAmount, settings)}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Mora Acumulada:</span>
              <p className="font-semibold text-red-600">
                {formatCurrency(loan.lateFeeAmount, settings)}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Cobrador:</span>
              <p className="font-semibold">{loan.collector.fullName}</p>
            </div>
          </div>

          {loan.lastContact && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              Última gestión: {loan.lastContact.contactType} - {loan.lastContact.result}{' '}
              ({formatDistanceToNow(new Date(loan.lastContact.createdAt), { 
                addSuffix: true, 
                locale: es 
              })})
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <ContactActions 
            customer={loan.customer} 
            onLogClick={() => onLogClick(loan)} 
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewLoan(loan.id)}
          >
            Ver Cuenta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function Collections() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  
  const [stats, setStats] = useState({
    totalOverdueAmount: 0,
    overdueCustomers: 0,
    overdueLoans: 0,
    avgDaysOverdue: 0
  });
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchOverdueLoans();
  }, [daysFilter, pagination.page]);

  const fetchStats = async () => {
    try {
      const data = await collectionService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error al cargar estadísticas');
    }
  };

  const fetchOverdueLoans = async () => {
    try {
      setLoading(true);
      const data = await collectionService.getOverdueLoans({
        daysRange: daysFilter,
        page: pagination.page,
        limit: 10
      });
      setLoans(data.loans);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching overdue loans:', error);
      toast.error('Error al cargar morosos');
    } finally {
      setLoading(false);
    }
  };

  const handleDaysFilter = (range) => {
    setDaysFilter(range === daysFilter ? '' : range);
    setPagination({ ...pagination, page: 1 });
  };

  const handleCollectionLog = (loan) => {
    setSelectedLoan(loan);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedLoan(null);
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Morosidad y Cobranza</h1>
        <p className="text-gray-600 mt-1">Gestión de clientes con pagos vencidos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Monto Total Mora"
          value={stats.totalOverdueAmount}
          icon={AlertTriangle}
          colorClass="text-red-600"
          formatValue={(val) => formatCurrency(val, settings)}
        />
        <StatCard
          title="Clientes Morosos"
          value={stats.overdueCustomers}
          icon={Users}
          colorClass="text-orange-600"
        />
        <StatCard
          title="Cuentas Vencidas"
          value={stats.overdueLoans}
          icon={TrendingUp}
          colorClass="text-yellow-600"
        />
        <StatCard
          title="Promedio Días Mora"
          value={stats.avgDaysOverdue}
          icon={Calendar}
          colorClass="text-blue-600"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Filtrar por días de mora:
            </span>
            {DAYS_FILTERS.map((filter) => (
              <FilterButton
                key={filter.value}
                active={daysFilter === filter.value}
                onClick={() => handleDaysFilter(filter.value)}
                label={filter.label}
                color={filter.color}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clientes Morosos ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay clientes morosos en este momento
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {loans.map((loan) => (
                  <OverdueLoanItem
                    key={loan.id}
                    loan={loan}
                    settings={settings}
                    onLogClick={handleCollectionLog}
                    onViewLoan={(id) => navigate(`/prestamos/${id}`)}
                  />
                ))}
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
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
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

      <CollectionModal
        open={modalOpen}
        onClose={handleModalClose}
        loan={selectedLoan}
        onSuccess={fetchOverdueLoans}
      />
    </div>
  );
}
