import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSettings } from '@/hooks/useSettings';
import { dashboardService } from '@/services/dashboardService';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign, TrendingUp, AlertTriangle, FileText,
  Calendar, Clock, User
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  // Tooltip personalizado con formatters
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-slate-900 mb-2">{payload[0].payload.month}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-semibold text-slate-900">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const metricsData = [
    {
      title: 'Saldo Administrado',
      value: formatCurrency(stats.summary.totalDisbursed, settings),
      subtitle: `${stats.summary.totalActiveLoans} cuentas activas`,
      icon: DollarSign,
      gradient: 'from-primary-500 to-primary-700',
      bgGlow: 'bg-primary-500/10',
      iconColor: 'text-primary-600'
    },
    {
      title: 'Recuperado Este Mes',
      value: formatCurrency(stats.summary.recoveredThisMonth, settings),
      subtitle: 'Ingresos del mes',
      icon: TrendingUp,
      gradient: 'from-success-500 to-success-700',
      bgGlow: 'bg-success-500/10',
      iconColor: 'text-success-600'
    },
    {
      title: 'Cartera Vencida',
      value: formatCurrency(stats.summary.overdueAmount, settings),
      subtitle: `${stats.summary.totalDefaultedLoans} en mora`,
      icon: AlertTriangle,
      gradient: 'from-danger-500 to-danger-700',
      bgGlow: 'bg-danger-500/10',
      iconColor: 'text-danger-600'
    },
    {
      title: 'Solicitudes Pendientes',
      value: stats.summary.pendingApplications.toString(),
      subtitle: 'Por revisar',
      icon: FileText,
      gradient: 'from-warning-500 to-warning-700',
      bgGlow: 'bg-warning-500/10',
      iconColor: 'text-warning-600'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Bienvenido de vuelta, <span className="font-semibold text-primary-600">{user?.fullName}</span>
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300 group border-slate-200/60">
                <div className={`absolute inset-0 ${metric.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-600 mb-1">
                        {metric.title}
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {metric.value}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {metric.subtitle}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="border-slate-200/60 shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-slate-900">Comportamiento de Cartera - Últimos 12 Meses</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Distribucion de cuentas por estado</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={stats.monthlyStats}>
                  <defs>
                    <linearGradient id="colorActivos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorPagados" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorMora" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="mora" 
                    stackId="1" 
                    stroke="#f59e0b" 
                    fill="url(#colorMora)"
                    name="En Mora"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pagados" 
                    stackId="1" 
                    stroke="#3b82f6" 
                    fill="url(#colorPagados)"
                    name="Pagados"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="activos" 
                    stackId="1" 
                    stroke="#14b8a6" 
                    fill="url(#colorActivos)"
                    name="Activos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="border-slate-200/60 shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-slate-900">Estado de Cuentas</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Distribución actual</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value} cuentas`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {stats.pieData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="text-slate-700 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card className="border-slate-200/60 shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Próximos Vencimientos
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Siguientes 7 días</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  {stats.upcomingInstallments?.length || 0}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.upcomingInstallments && stats.upcomingInstallments.length > 0 ? (
                  stats.upcomingInstallments.map((inst) => (
                    <div 
                      key={inst.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/prestamos/${inst.loanId}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{inst.customer.name}</p>
                          <p className="text-xs text-slate-500">Cuenta #{inst.loanId} - Cuota #{inst.installmentNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatCurrency(inst.amount, settings)}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(inst.dueDate, settings)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay vencimientos próximos</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Card className="border-slate-200/60 shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Clientes en Mora
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">Top 5 por días de atraso</p>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                  {stats.topOverdueClients?.length || 0}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topOverdueClients && stats.topOverdueClients.length > 0 ? (
                  stats.topOverdueClients.map((client, index) => (
                    <div 
                      key={client.customerId}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/prestamos/${client.loanId}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-red-600' : 
                          index === 1 ? 'bg-orange-500' : 
                          'bg-yellow-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{client.customerName}</p>
                          <p className="text-xs text-slate-500">
                            {client.installmentsCount} cuota{client.installmentsCount > 1 ? 's' : ''} vencida{client.installmentsCount > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{formatCurrency(client.overdueAmount, settings)}</p>
                        <p className="text-xs text-red-500 font-medium">
                          {client.daysOverdue} día{client.daysOverdue > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay clientes en mora</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
