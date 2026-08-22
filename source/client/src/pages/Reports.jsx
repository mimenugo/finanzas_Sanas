import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { reportService } from '@/services/reportService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FileText, DollarSign, TrendingUp, AlertCircle, Users,
  Download, Calendar, Filter, Shield
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BRAND_NAME } from '@/constants/branding';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Reports() {
  const { user } = useAuthStore();
  const [selectedReport, setSelectedReport] = useState('portfolio');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    collectorId: '',
    status: '',
    daysRange: '',
    userId: '',
    module: '',
    action: ''
  });

  const reportTypes = [
    {
      id: 'portfolio',
      name: 'Cartera Total',
      icon: FileText,
      roles: ['ADMIN', 'ANALISTA', 'COBRADOR'],
      description: 'Estado de cuentas activas, pagadas y vencidas'
    },
    {
      id: 'income',
      name: 'Ingresos',
      icon: DollarSign,
      roles: ['ADMIN', 'ANALISTA', 'COBRADOR'],
      description: 'Pagos recibidos en período'
    },
    {
      id: 'disbursements',
      name: 'Activaciones',
      icon: TrendingUp,
      roles: ['ADMIN', 'ANALISTA', 'COBRADOR'],
      description: 'Cuentas activadas'
    },
    {
      id: 'overdue',
      name: 'Mora Detallada',
      icon: AlertCircle,
      roles: ['ADMIN', 'ANALISTA', 'COBRADOR'],
      description: 'Análisis de morosidad'
    },
    {
      id: 'collector-performance',
      name: 'Rendimiento Cobradores',
      icon: Users,
      roles: ['ADMIN', 'ANALISTA'],
      description: 'Productividad de cobradores'
    },
    {
      id: 'customers',
      name: 'Clientes',
      icon: Users,
      roles: ['ADMIN', 'ANALISTA'],
      description: 'Estadísticas de clientes'
    },
    {
      id: 'audit',
      name: 'Auditoría',
      icon: Shield,
      roles: ['ADMIN'],
      description: 'Registro de acciones del sistema'
    }
  ];

  const availableReports = reportTypes.filter(report =>
    report.roles.includes(user.role)
  );

  useEffect(() => {
    if (selectedReport) {
      loadReport();
    }
  }, [selectedReport]);

  const loadReport = async () => {
    try {
      setLoading(true);
      let data;

      switch (selectedReport) {
        case 'portfolio':
          data = await reportService.getPortfolio(filters);
          break;
        case 'income':
          data = await reportService.getIncome(filters);
          break;
        case 'disbursements':
          data = await reportService.getDisbursements(filters);
          break;
        case 'overdue':
          data = await reportService.getOverdue(filters);
          break;
        case 'collector-performance':
          data = await reportService.getCollectorPerformance(filters);
          break;
        case 'customers':
          data = await reportService.getCustomers(filters);
          break;
        case 'audit':
          data = await reportService.getAudit(filters);
          break;
        default:
          data = null;
      }

      setReportData(data);
    } catch (error) {
      toast.error('Error al cargar reporte');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.text(`${BRAND_NAME} - Reporte`, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    const reportTitle = reportTypes.find(r => r.id === selectedReport)?.name || '';
    doc.text(reportTitle, pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 32, { align: 'center' });
    doc.text(`Usuario: ${user.fullName}`, pageWidth / 2, 37, { align: 'center' });

    let startY = 45;

    if (selectedReport === 'portfolio' && reportData) {
      doc.setFontSize(12);
      doc.text('Resumen de Cartera', 14, startY);
      startY += 7;

      const summaryData = [
        ['Activos', reportData.summary.active.count, `$${reportData.summary.active.amount.toFixed(2)}`],
        ['Pagados', reportData.summary.paid.count, `$${reportData.summary.paid.amount.toFixed(2)}`],
        ['En Mora', reportData.summary.overdue.count, `$${reportData.summary.overdue.amount.toFixed(2)}`],
        ['Mora Acumulada', '-', `$${reportData.summary.overdue.lateFee.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: startY,
        head: [['Estado', 'Cantidad', 'Monto']],
        body: summaryData,
        theme: 'grid'
      });

      if (reportData.loans && reportData.loans.length > 0) {
        doc.addPage();
        doc.text('Detalle de Cuentas', 14, 15);

        const loansData = reportData.loans.slice(0, 50).map(loan => [
          loan.id,
          loan.customer,
          loan.status,
          `$${loan.balance.toFixed(2)}`,
          loan.hasOverdue ? 'Sí' : 'No'
        ]);

        autoTable(doc, {
          startY: 25,
          head: [['ID', 'Cliente', 'Estado', 'Saldo', 'Mora']],
          body: loansData,
          theme: 'striped',
          styles: { fontSize: 8 }
        });
      }
    }

    if (selectedReport === 'income' && reportData) {
      doc.setFontSize(12);
      doc.text('Resumen de Ingresos', 14, startY);
      startY += 7;

      const summaryData = [
        ['Total Ingresos', `$${reportData.summary.totalIncome.toFixed(2)}`],
        ['Capital', `$${reportData.summary.totalPrincipal.toFixed(2)}`],
        ['Intereses', `$${reportData.summary.totalInterest.toFixed(2)}`],
        ['Mora', `$${reportData.summary.totalLateFee.toFixed(2)}`],
        ['Pagos', reportData.summary.paymentCount]
      ];

      autoTable(doc, {
        startY: startY,
        body: summaryData,
        theme: 'plain'
      });
    }

    if (selectedReport === 'overdue' && reportData) {
      doc.setFontSize(12);
      doc.text('Resumen de Morosidad', 14, startY);
      startY += 7;

      const summaryData = [
        ['Total Cuentas', reportData.summary.totalLoans],
        ['Monto Vencido', `$${reportData.summary.totalOverdueAmount.toFixed(2)}`],
        ['Mora Acumulada', `$${reportData.summary.totalLateFee.toFixed(2)}`],
        ['Deuda Total', `$${reportData.summary.totalDebt.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: startY,
        body: summaryData,
        theme: 'plain'
      });

      if (reportData.loans && reportData.loans.length > 0) {
        doc.addPage();
        doc.text('Detalle de Morosos', 14, 15);

        const loansData = reportData.loans.slice(0, 50).map(loan => [
          loan.customer,
          loan.daysOverdue,
          `${loan.totalDebt.toFixed(2)}`,
          loan.phone
        ]);

        autoTable(doc, {
          startY: 25,
          head: [['Cliente', 'Días Mora', 'Deuda Total', 'Teléfono']],
          body: loansData,
          theme: 'striped',
          styles: { fontSize: 8 }
        });
      }
    }

    doc.save(`reporte-${selectedReport}-${Date.now()}.pdf`);
    toast.success('PDF generado exitosamente');
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    if (selectedReport === 'portfolio' && reportData) {
      const summaryWs = XLSX.utils.json_to_sheet([
        { Estado: 'Activos', Cantidad: reportData.summary.active.count, Monto: reportData.summary.active.amount },
        { Estado: 'Pagados', Cantidad: reportData.summary.paid.count, Monto: reportData.summary.paid.amount },
        { Estado: 'En Mora', Cantidad: reportData.summary.overdue.count, Monto: reportData.summary.overdue.amount }
      ]);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

      if (reportData.loans) {
        const loansWs = XLSX.utils.json_to_sheet(reportData.loans.map(loan => ({
          ID: loan.id,
          Cliente: loan.customer,
          Documento: loan.documentNumber,
          Cobrador: loan.collector,
          Monto: loan.amount,
          Saldo: loan.balance,
          Estado: loan.status,
          'En Mora': loan.hasOverdue ? 'Sí' : 'No',
          'Monto Vencido': loan.overdueAmount,
          'Mora Acumulada': loan.lateFee
        })));
        XLSX.utils.book_append_sheet(wb, loansWs, 'Cuentas');
      }
    }

    if (selectedReport === 'income' && reportData) {
      const summaryWs = XLSX.utils.json_to_sheet([
        { Concepto: 'Total Ingresos', Monto: reportData.summary.totalIncome },
        { Concepto: 'Capital', Monto: reportData.summary.totalPrincipal },
        { Concepto: 'Intereses', Monto: reportData.summary.totalInterest },
        { Concepto: 'Mora', Monto: reportData.summary.totalLateFee }
      ]);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

      if (reportData.payments) {
        const paymentsWs = XLSX.utils.json_to_sheet(reportData.payments.map(p => ({
          Fecha: new Date(p.date).toLocaleDateString(),
          Cliente: p.customer,
          Cuenta: p.loanId,
          Monto: p.amount,
          Método: p.method,
          Cobrador: p.collector,
          Capital: p.principal,
          Interés: p.interest,
          Mora: p.lateFee
        })));
        XLSX.utils.book_append_sheet(wb, paymentsWs, 'Pagos');
      }
    }

    if (selectedReport === 'overdue' && reportData) {
      if (reportData.loans) {
        const loansWs = XLSX.utils.json_to_sheet(reportData.loans.map(loan => ({
          Cliente: loan.customer,
          Documento: loan.documentNumber,
          Teléfono: loan.phone,
          Cobrador: loan.collector,
          'Días Mora': loan.daysOverdue,
          'Cuotas Vencidas': loan.overdueInstallments,
          'Monto Vencido': loan.overdueAmount,
          'Mora Acumulada': loan.lateFee,
          'Deuda Total': loan.totalDebt
        })));
        XLSX.utils.book_append_sheet(wb, loansWs, 'Morosos');
      }
    }

    if (selectedReport === 'collector-performance' && reportData) {
      if (reportData.collectors) {
        const collectorsWs = XLSX.utils.json_to_sheet(reportData.collectors.map(c => ({
          Cobrador: c.name,
          Email: c.email,
          'Cuentas Activas': c.activeLoans,
          'Cuentas en Mora': c.overdueLoans,
          'Saldo Cartera': c.portfolioBalance,
          'Saldo en Mora': c.overdueBalance,
          'Monto Cobrado': c.collectedAmount,
          'Cantidad Pagos': c.paymentsCount,
          'Gestiones': c.collectionLogsCount,
          'Tasa Recuperación': c.recoveryRate
        })));
        XLSX.utils.book_append_sheet(wb, collectorsWs, 'Cobradores');
      }
    }

    XLSX.writeFile(wb, `reporte-${selectedReport}-${Date.now()}.xlsx`);
    toast.success('Excel generado exitosamente');
  };

  const renderChart = () => {
    if (!reportData || !reportData.summary) return null;

    if (selectedReport === 'portfolio' && reportData.summary.active) {
      const chartData = [
        { name: 'Activos', value: reportData.summary.active.count, amount: reportData.summary.active.amount },
        { name: 'Pagados', value: reportData.summary.paid.count, amount: reportData.summary.paid.amount },
        { name: 'En Mora', value: reportData.summary.overdue.count, amount: reportData.summary.overdue.amount }
      ];

      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Cantidad</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución por Monto</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="amount" fill="#8884d8" name="Monto" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (selectedReport === 'income' && reportData.dailyIncome) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Diarios</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.dailyIncome}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" name="Ingresos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    if (selectedReport === 'overdue' && reportData.rangeBreakdown) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Mora por Rango de Días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.rangeBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="amount" fill="#FF8042" name="Monto" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reportes</h1>
          <p className="text-gray-600">Genera y exporta reportes del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {availableReports.map(report => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedReport === report.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedReport === report.id ? 'bg-primary text-white' : 'bg-gray-100'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{report.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{report.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadReport}
                disabled={loading}
              >
                <Filter className="w-4 h-4 mr-2" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['income', 'disbursements', 'customers', 'audit'].includes(selectedReport) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Generando reporte...</p>
          </CardContent>
        </Card>
      ) : reportData ? (
        <>
          <div className="flex justify-end gap-2">
            <Button onClick={exportToPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button onClick={exportToExcel} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>

          {renderChart()}

          <Card>
            <CardHeader>
              <CardTitle>Datos Detallados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <pre className="text-xs bg-gray-50 p-4 rounded-lg">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Selecciona un tipo de reporte y aplica filtros</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
