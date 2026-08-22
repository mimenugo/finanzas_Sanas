import { useState, useEffect } from 'react';
import { cashService } from '../services/cashService';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRightLeft,
  History
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import CreateCashModal from '../components/cash/CreateCashModal';
import CreateMovementModal from '../components/cash/CreateMovementModal';
import TransferModal from '../components/cash/TransferModal';
import CloseCashModal from '../components/cash/CloseCashModal';
import CashMovementsTable from '../components/cash/CashMovementsTable';

export default function Cash() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalBalance: 0,
    todayIncome: 0,
    todayExpense: 0
  });
  const [cashes, setCashes] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCash, setSelectedCash] = useState(null);
  const [activeTab, setActiveTab] = useState('cashes'); // ← AGREGAR ESTE ESTADO

  // Modales
  const [showCreateCash, setShowCreateCash] = useState(false);
  const [showCreateMovement, setShowCreateMovement] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showCloseCash, setShowCloseCash] = useState(false);

  // Permisos
  const canCreateCash = user?.role === 'ADMIN';
  const canTransfer = user?.role === 'ADMIN';
  const canCreateMovement = ['ADMIN', 'ANALISTA', 'COBRADOR'].includes(user?.role);
  const canCloseCash = ['ADMIN', 'ANALISTA'].includes(user?.role);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, cashesRes, flowRes] = await Promise.all([
        cashService.getStats(),
        cashService.getCashes(),
        cashService.getCashFlow()
      ]);

      setStats(statsRes.data);
      setCashes(cashesRes.data);
      setCashFlow(flowRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCashCreated = () => {
    setShowCreateCash(false);
    loadData();
  };

  const handleMovementCreated = () => {
    setShowCreateMovement(false);
    loadData();
  };

  const handleTransferCreated = () => {
    setShowTransfer(false);
    loadData();
  };

  const handleCashClosed = () => {
    setShowCloseCash(false);
    loadData();
  };

  // ← AGREGAR ESTA FUNCIÓN
  const handleViewMovements = (cash) => {
    setSelectedCash(cash);
    setActiveTab('movements');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Cajas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Administra cajas, movimientos y transferencias
          </p>
        </div>
        <div className="flex gap-2">
          {canTransfer && (
            <Button onClick={() => setShowTransfer(true)} variant="outline">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transferir
            </Button>
          )}
          {canCreateMovement && (
            <Button onClick={() => setShowCreateMovement(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Movimiento
            </Button>
          )}
          {canCreateCash && (
            <Button onClick={() => setShowCreateCash(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Caja
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(stats.totalBalance)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Hoy</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {formatCurrency(stats.todayIncome)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Egresos Hoy</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {formatCurrency(stats.todayExpense)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Gráfico de Flujo de Caja */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Flujo de Caja - Últimos 30 Días
        </h3>
        <div className="space-y-2">
          {cashFlow.length > 0 ? (
            cashFlow.slice(-15).map((item, index) => {
              const maxValue = Math.max(
                ...cashFlow.map(d => Math.max(parseFloat(d.income), parseFloat(d.expense)))
              );
              const incomeWidth = (parseFloat(item.income) / maxValue) * 100;
              const expenseWidth = (parseFloat(item.expense) / maxValue) * 100;

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{new Date(item.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                    <div className="flex gap-4">
                      <span className="text-green-600 dark:text-green-400">
                        +{formatCurrency(item.income)}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        -{formatCurrency(item.expense)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                      <div 
                        className="bg-green-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${incomeWidth}%` }}
                      />
                    </div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                      <div 
                        className="bg-red-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${expenseWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
              No hay datos disponibles
            </div>
          )}
        </div>
        {cashFlow.length > 0 && (
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-gray-600 dark:text-gray-400">Egresos</span>
            </div>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full"> {/* ← CAMBIO AQUÍ */}
        <TabsList>
          <TabsTrigger value="cashes">Cajas</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="cashes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cashes.map((cash) => (
              <Card key={cash.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{cash.name}</h4>
                    <Badge variant="outline" className="mt-1">
                      {cash.type}
                    </Badge>
                    {cash.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {cash.description}
                      </p>
                    )}
                  </div>
                  <Wallet className="w-5 h-5 text-gray-400" />
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Saldo</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(cash.balance)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewMovements(cash)} 
                  >
                    Ver Movimientos
                  </Button>
                  {canCloseCash && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCash(cash);
                        setShowCloseCash(true);
                      }}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="movements">
          {selectedCash ? (
            <CashMovementsTable 
              cash={selectedCash} 
              onClose={() => {
                setSelectedCash(null);
                setActiveTab('cashes'); // ← AGREGAR ESTO
              }}
            />
          ) : (
            <Card className="p-12 text-center">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Selecciona una caja para ver sus movimientos
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modales */}
      {canCreateCash && (
        <CreateCashModal
          open={showCreateCash}
          onClose={() => setShowCreateCash(false)}
          onSuccess={handleCashCreated}
        />
      )}

      {canCreateMovement && (
        <CreateMovementModal
          open={showCreateMovement}
          onClose={() => setShowCreateMovement(false)}
          onSuccess={handleMovementCreated}
          cashes={cashes}
        />
      )}

      {canTransfer && (
        <TransferModal
          open={showTransfer}
          onClose={() => setShowTransfer(false)}
          onSuccess={handleTransferCreated}
          cashes={cashes}
        />
      )}

      {canCloseCash && selectedCash && (
        <CloseCashModal
          open={showCloseCash}
          onClose={() => {
            setShowCloseCash(false);
            setSelectedCash(null);
          }}
          onSuccess={handleCashClosed}
          cash={selectedCash}
        />
      )}
    </div>
  );
}