import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Pill, Salad, FileText, Activity, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { Heart } from 'lucide-react';
import VoiceMicButton from '../../components/voice/VoiceMicButton';
import VoiceOverlay from '../../components/voice/VoiceOverlay';
import { VoiceProvider } from '../../context/VoiceContext';

const NAV = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/patient/dashboard' },
  { key: 'medicines', icon: Pill, path: '/patient/medicines' },
  { key: 'diet', icon: Salad, path: '/patient/diet' },
  { key: 'reminders', icon: Bell, path: '/patient/reminders' },
  { key: 'reports', icon: FileText, path: '/patient/reports' },
  { key: 'progress', icon: Activity, path: '/patient/progress' },
];

export default function PatientLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user } = useAuth();

  const isProfile = pathname === '/patient/profile';

  return (
    <VoiceProvider userLanguage={user?.language || 'en'}>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-logo">
            <Heart fill="#0EA5E9" stroke="none" size={20} />
            VitalSync
          </div>
          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={() => navigate('/patient/profile')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#EF4444,#8B5CF6)' }}>
                {user?.name?.[0] || 'A'}
              </div>
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>

        {/* Voice overlay (always rendered, hidden when idle) */}
        <VoiceOverlay />

        {/* Voice mic button — shown on all tabs EXCEPT profile */}
        {!isProfile && <VoiceMicButton />}

        {/* SOS button — bottom right above nav bar, hidden on profile */}
        {!isProfile && (
          <button
            className="fab fab-sos"
            onClick={() => navigate('/patient/sos')}
            aria-label="SOS"
          >
            SOS
          </button>
        )}

        <nav className="bottom-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path;
            return (
              <Link key={item.key} to={item.path} className={`nav-item ${active ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
                <div className="nav-item-icon">
                  <Icon size={22} />
                </div>
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </VoiceProvider>
  );
}
