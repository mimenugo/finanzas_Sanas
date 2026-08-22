import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { LogIn, Mail, Lock, AlertCircle, DollarSign, Eye, EyeOff, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { BRAND_NAME, PUBLIC_DESCRIPTION, normalizeBrandName } from '@/constants/branding';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const { settings, loadPublicSettings } = useSettingsStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // Cargar configuraciones públicas al montar
  useEffect(() => {
    loadPublicSettings();
  }, [loadPublicSettings]);

  // Limpiar bloqueos locales heredados de pruebas anteriores.
  useEffect(() => {
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('blockExpiry');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password, formData.rememberMe);
      
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('blockExpiry');
      
      toast.success('¡Bienvenido de vuelta!');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.error || 'Error al iniciar sesión';
      setError(message);
      toast.error(message);
      
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('loginAttempts', newAttempts.toString());
      
      if (newAttempts >= 5) {
        const blockExpiry = Date.now() + (15 * 60 * 1000);
        localStorage.setItem('blockExpiry', blockExpiry.toString());
        setIsBlocked(true);
        toast.error('Cuenta bloqueada por 15 minutos debido a múltiples intentos fallidos');
        
        setTimeout(() => {
          setIsBlocked(false);
          setFailedAttempts(0);
          localStorage.removeItem('loginAttempts');
          localStorage.removeItem('blockExpiry');
          toast.success('Bloqueo removido. Puede intentar nuevamente.');
        }, 15 * 60 * 1000);
      } else {
        toast.warning(`Intentos restantes: ${5 - newAttempts}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const companyLogo = settings?.company?.company_logo;
  const companyName = normalizeBrandName(settings?.company?.company_name || BRAND_NAME);

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <div className="login-premium-bg absolute inset-0" />
      <div className="login-premium-grid absolute inset-0" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary-400/20 blur-3xl" />
      <div className="absolute -right-28 bottom-[-7rem] h-96 w-96 rounded-full bg-teal-300/15 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

      {/* Glassmorphism card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="login-card-premium rounded-2xl shadow-2xl p-8 space-y-6 border border-white/10">
          {/* Logo */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4 shadow-lg shadow-primary-500/50 overflow-hidden">
              {companyLogo ? (
                <img 
                  src={`http://localhost:5000${companyLogo}`}
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
            <h1 className="text-3xl font-bold text-white tracking-tight uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {companyName}
            </h1>
            <p className="text-slate-300 mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Portal Finanzas Sanas y Bienestar Financiero
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {PUBLIC_DESCRIPTION}
            </p>
          </motion.div>

          {/* Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg flex items-center gap-2 backdrop-blur-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            {isBlocked && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-3 rounded-lg flex items-center gap-2 backdrop-blur-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Cuenta bloqueada por 15 minutos</span>
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isBlocked}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="admin@finanzassanas.local"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isBlocked}
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                  disabled={isBlocked}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={isBlocked}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-slate-300" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Recordar sesión
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || isBlocked}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 transition shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </motion.form>

          {/* Demo credentials */}
          {import.meta.env.DEV && (
            <motion.div 
              className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-slate-300 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <p className="font-medium mb-2 text-white">Credenciales de prueba local:</p>
              <p className="text-xs">Admin: <span className="text-primary-400">admin@creditmanager.com</span> / <span className="text-primary-400">admin123</span></p>
              <p className="text-xs">Cobrador: <span className="text-primary-400">cobrador@creditmanager.com</span> / <span className="text-primary-400">cobrador123</span></p>
            </motion.div>
          )}

          {/* Footer note */}
          <motion.p 
            className="text-center text-xs text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Los usuarios son creados por el administrador del sistema
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
