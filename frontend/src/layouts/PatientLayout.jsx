import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Pill, Salad, FileText, Activity, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Heart } from 'lucide-react';
import VoiceMicButton from '../components/voice/VoiceMicButton';
import VoiceOverlay from '../components/voice/VoiceOverlay';
import { VoiceProvider } from '../context/VoiceContext';
import VoiceNavigator from '../components/VoiceNavigator';

const NAV = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/patient/dashboard' },
  { key: 'medicines', icon: Pill, path: '/patient/medicines' },
  { key: 'diet', icon: Salad, path: '/patient/diet' },
  { key: 'reminders', icon: Bell, path: '/patient/reminders' },
  { key: 'reports', icon: FileText, path: '/patient/reports' },
  { key: 'progress', icon: Activity, path: '/patient/progress' },
];

export default function PatientLayout({ children }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const isProfile = pathname === '/patient/profile';

  return (
    <VoiceProvider userLanguage={user?.language || 'en'}>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => router.push('/patient/dashboard')}>
            <img src="/logo.png" alt="VitalSync" style={{ height: 32, width: 'auto', filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.4))' }} />
            <span style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>VitalSync</span>
          </div>
          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={() => router.push('/patient/profile')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#EF4444,#8B5CF6)' }}>
                {user?.name?.[0] || 'A'}
              </div>
            </button>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>

        {/* Voice navigator — compass button for voice-based page navigation */}
        {!isProfile && <VoiceNavigator />}

        {/* Voice overlay (always rendered, hidden when idle) */}
        <VoiceOverlay />

        {/* Voice mic button — shown on all tabs EXCEPT profile */}
        {!isProfile && <VoiceMicButton />}

        {/* SOS button — bottom right above nav bar, hidden on profile */}
        {!isProfile && (
          <button
            className="fab fab-sos"
            onClick={() => router.push('/patient/sos')}
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
              <Link key={item.key} href={item.path} className={`nav-item ${active ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
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
