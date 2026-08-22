import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Applications from './pages/Applications';
import ApplicationDetail from './pages/ApplicationDetail';
import Approvals from './pages/Approvals';
import Loans from './pages/Loans';
import MainLayout from './components/layout/MainLayout';
import LoanDetail from './pages/LoanDetail';
import Payments from './pages/Payments';
import Collections from './pages/Collections';
import Notifications from './pages/Notifications';
import Cash from './pages/Cash';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import PublicRegistration from './pages/PublicRegistration';
import PaymentCollections from './pages/PaymentCollections';
import ClientPayments from './pages/ClientPayments';
import { DEFAULT_VISUAL_THEME } from '@/constants/visualThemes';


function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  const settings = useSettingsStore(state => state.settings);
  const loadPublicSettings = useSettingsStore(state => state.loadPublicSettings);

  useEffect(() => {
    loadPublicSettings();
  }, [loadPublicSettings]);

  useEffect(() => {
    const savedTheme = settings?.appearance?.app_theme
      || localStorage.getItem('app_theme')
      || DEFAULT_VISUAL_THEME;
    document.documentElement.dataset.visualTheme = savedTheme;
    localStorage.setItem('app_theme', savedTheme);
  }, [settings?.appearance?.app_theme]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro/:token" element={<PublicRegistration />} />
        <Route path="/mis-pagos" element={<ClientPayments />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clientes" element={<Customers />} />
          <Route path="clientes/:id" element={<CustomerDetail />} />
          <Route path="solicitudes" element={<Applications />} />
          <Route path="solicitudes/:id" element={<ApplicationDetail />} />
          <Route path="aprobaciones" element={<Approvals />} />
          <Route path="prestamos" element={<Loans />} />
          <Route path="prestamos/:id" element={<LoanDetail />} />
          <Route path="pagos" element={<Payments />} />
          <Route path="pagos-cobranza" element={<PaymentCollections />} />
          <Route path="morosidad" element={<Collections />} />
          <Route path="notificaciones" element={< Notifications />} />
          <Route path="cajas" element={<Cash />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="usuarios" element={< Users />} />
          <Route path="configuracion" element={<Settings/>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
