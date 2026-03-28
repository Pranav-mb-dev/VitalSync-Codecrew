import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Users, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { Heart } from 'lucide-react';

export default function DoctorLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user } = useAuth();
  const { unreadCount } = useAlerts();

  const NAV = [
    { key: 'patients', icon: Users, path: '/doctor/patients' },
    { key: 'profile', icon: User, path: '/doctor/profile' },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/doctor/patients')}>
          <img src="/logo.png" alt="VitalSync" style={{ height: 32, width: 'auto', filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.4))' }} />
          <span style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>VitalSync</span>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <button onClick={() => navigate('/doctor/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#22C55E,#0EA5E9)' }}>
              {user?.name?.replace('Dr. ', '')?.[0] || 'N'}
            </div>
          </button>
        </div>
      </header>
      <main className="page-content">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.path);
          return (
            <Link key={item.key} to={item.path} className={`nav-item ${active ? 'active' : ''}`} style={{ minWidth: 100, textDecoration: 'none' }}>
              <div className="nav-item-icon" style={{ position: 'relative' }}>
                <Icon size={22} />
                {item.key === 'patients' && unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
              </div>
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
