'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Pill, Salad, FileText, Activity, Bell, Clock } from 'lucide-react';
import { Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'
import { useAlerts } from '../../context/AlertContext'
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import VoiceMicButton from '../../components/voice/VoiceMicButton';
import VoiceOverlay from '../../components/voice/VoiceOverlay';
import { VoiceProvider } from '../../context/VoiceContext';
import Link from 'next/link';

const NAV = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/caregiver/dashboard' },
  { key: 'medicines', icon: Pill, path: '/caregiver/medicines' },
  { key: 'diet', icon: Salad, path: '/caregiver/diet' },
  { key: 'reminders', icon: Clock, path: '/caregiver/reminders' },
  { key: 'reports', icon: FileText, path: '/caregiver/reports' },
  { key: 'progress', icon: Activity, path: '/caregiver/progress' },
];

export default function CaregiverLayout({ children }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useAlerts();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'caregiver') router.replace(`/${user.role}/dashboard`);   
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'caregiver') return null;
  return (
    <VoiceProvider userLanguage={user?.language || 'en'}>
    <div className="app-shell">
      <header className="app-header">
        <div className="header-logo"><Heart fill="#0EA5E9" stroke="none" size={20} />{t('vitalsync_brand', 'VitalSync')}</div>
        <div className="header-actions">
          <LanguageSwitcher />
          <ThemeToggle />

          {/* Alerts bell in header */}
          <Link href="/caregiver/alerts" style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: 6, color: 'var(--text-secondary)', textDecoration: 'none' }} aria-label="Alerts">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                background: 'var(--danger)', color: '#fff',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <Link href="/caregiver/profile" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none' }}>
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#0EA5E9,#22C55E)' }}>{user?.name?.[0] || 'C'}</div>
          </Link>
        </div>
      </header>

      <main className="page-content">{children}</main>
      <VoiceMicButton />
      <VoiceOverlay />

      <nav className="bottom-nav">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <Link key={item.key} href={item.path} className={`nav-item ${active ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
              <div className="nav-item-icon">
                <Icon size={20} />
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
