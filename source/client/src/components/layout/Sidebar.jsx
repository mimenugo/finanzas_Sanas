import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, CheckCircle,
  DollarSign, CreditCard, AlertTriangle, BarChart3,
  Settings, LogOut, Menu, X, Wallet, UserCog, Building2, Landmark
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSettings } from '@/hooks/useSettings';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BRAND_NAME, normalizeBrandName } from '@/constants/branding';
import { buildServerUrl } from '@/config/apiConfig';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'ANALISTA', 'COBRADOR', 'CONSULTA'] },
  { path: '/clientes', icon: Users, label: 'Clientes', roles: ['ADMIN', 'ANALISTA', 'COBRADOR', 'CONSULTA'] },
  { path: '/solicitudes', icon: FileText, label: 'Solicitudes', roles: ['ADMIN', 'ANALISTA', 'CONSULTA'] },
  { path: '/aprobaciones', icon: CheckCircle, label: 'Aprobaciones', roles: ['ADMIN', 'ANALISTA', 'CONSULTA'] },
  { path: '/prestamos', icon: DollarSign, label: 'Cuentas', roles: ['ADMIN', 'ANALISTA', 'COBRADOR', 'CONSULTA'] },
  { path: '/pagos', icon: CreditCard, label: 'Pagos', roles: ['ADMIN', 'ANALISTA', 'COBRADOR'] },
  { path: '/pagos-cobranza', icon: Landmark, label: 'Pagos y Cobranza', roles: ['ADMIN', 'ANALISTA', 'COBRADOR'] },
  { path: '/morosidad', icon: AlertTriangle, label: 'Morosidad', roles: ['ADMIN', 'ANALISTA', 'COBRADOR', 'CONSULTA'] },
  { path: '/cajas', icon: Wallet, label: 'Cajas', roles: ['ADMIN', 'ANALISTA', 'COBRADOR', 'CONSULTA'] },
  { path: '/reportes', icon: BarChart3, label: 'Reportes', roles: ['ADMIN', 'ANALISTA', 'COBRADOR', 'CONSULTA'] },
  { path: '/usuarios', icon: UserCog, label: 'Usuarios', roles: ['ADMIN'] },
  { path: '/configuracion', icon: Settings, label: 'Configuración', roles: ['ADMIN'] },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { company, loading: settingsLoading } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const companyLogo = company?.company_logo;
  const companyName = normalizeBrandName(company?.company_name || BRAND_NAME);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-900 text-white rounded-lg shadow-lg hover:bg-dark-800 transition-colors"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`lg:sticky fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900 border-r border-dark-700/50 flex flex-col z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="h-24 flex items-center justify-center px-6 border-b border-dark-700/50">
          {/* Logo redondeado centrado */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 overflow-hidden border-2 border-primary-400/20">
            {settingsLoading ? (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            ) : companyLogo ? (
              <img 
                src={buildServerUrl(companyLogo)}
                alt={companyName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M6 4h12v17H6z"/></svg>';
                }}
              />
            ) : (
              <Building2 className="w-10 h-10 text-white" />
            )}
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
          <div className="space-y-1">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative group ${
                    isActive
                      ? 'bg-dark-700/50 text-white'
                      : 'text-dark-300 hover:bg-dark-800/40 hover:text-white'
                  }`}
                >
                  <Icon 
                    className={`w-5 h-5 transition-all duration-200 ${
                      isActive ? 'text-primary-400' : 'text-dark-400 group-hover:text-dark-300'
                    } ${hoveredItem === item.path && !isActive ? 'scale-110' : ''}`}
                  />
                  <span 
                    className="font-medium text-sm flex-1 uppercase tracking-wider" 
                    style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '0.05em', fontSize: '0.8rem' }}
                  >
                    {item.label}
                  </span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeTriangle"
                      className="absolute right-0 top-1/2 -translate-y-1/2"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-primary-500 border-b-[8px] border-b-transparent" />
                    </motion.div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-dark-700/50 bg-dark-900/50">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-800/60 mb-3 border border-dark-700/50">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md">
              {user?.fullName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {user?.fullName}
              </p>
              <p className="text-dark-400 text-xs truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {user?.email}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 border border-red-500/20 hover:border-red-500/30 uppercase tracking-wider"
            style={{ fontFamily: 'Poppins, sans-serif', fontSize: '0.75rem', letterSpacing: '0.08em' }}
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
