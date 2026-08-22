import NotificationDropdown from './NotificationDropdown';
import { useAuthStore } from '@/store/authStore';
import { useSettings } from '@/hooks/useSettings';
import { BRAND_NAME, normalizeBrandName } from '@/constants/branding';

export default function Header() {
  const { user } = useAuthStore();
  const { company } = useSettings();

  const companyName = normalizeBrandName(company?.company_name || BRAND_NAME);

  return (
    <header className="sticky top-0 z-30 bg-dark-900/95 backdrop-blur-sm border-b border-dark-700/50 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left section - Company Name */}
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white uppercase tracking-wide" style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '0.08em' }}>
            {companyName}
          </h2>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4">
          {/* Notificaciones */}
          <NotificationDropdown />

          {/* User info */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-dark-800/60 rounded-lg border border-dark-700/50">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.fullName?.charAt(0)}
            </div>
            <div className="text-sm">
              <p className="text-white font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {user?.fullName}
              </p>
              <p className="text-dark-400 text-xs uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
