'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Pill, FileText, Activity, Bell, Salad } from 'lucide-react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import VoiceMicButton from '../../components/voice/VoiceMicButton';
import VoiceOverlay from '../../components/voice/VoiceOverlay';
import Link from 'next/link';

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
const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'patient') router.replace(`/${user.role}/dashboard`);
  }, [user, loading, mounted, router]);

  if (!mounted || loading || !user || user.role !== 'patient') return null;

  // Hide SOS and voice assistant on profile page
  const isProfile = pathname === '/patient/profile';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-logo"><Heart fill="#0EA5E9" stroke="none" size={20} />{t('vitalsync_brand', 'VitalSync')}</div>
        <div className="header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/patient/profile" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none' }}>
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#EF4444,#8B5CF6)' }}>
              {user?.name?.[0] || 'A'}
            </div>
          </Link>
        </div>
      </header>

      <main className="page-content">{children}</main>

      {/* Voice overlay — always rendered when active */}
      <VoiceOverlay />

      {/* Voice mic button — above SOS, hidden on profile */}
      {!isProfile && <VoiceMicButton />}

      {/* SOS button — bottom-right above nav bar, animated pulse, hidden on profile */}
      {!isProfile && (
        <button
          className="fab-sos"
          onClick={() => router.push('/patient/sos')}
          aria-label="SOS Emergency"
        >
          {t('sos')}
        </button>
      )}

      <nav className="bottom-nav">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <Link key={item.key} href={item.path} className={`nav-item ${active ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
              <div className="nav-item-icon"><Icon size={20} /></div>
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
