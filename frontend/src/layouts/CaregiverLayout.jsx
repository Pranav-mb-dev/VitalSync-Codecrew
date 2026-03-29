// Caregiver Layout - Alerts in header, Reminders in bottom nav
import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { LayoutDashboard, Pill, Salad, FileText, Activity, Bell, Clock, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';

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
  const router = useRouter();
  const pathname = router.pathname;
  const { user } = useAuth();
  const { unreadCount } = useAlerts();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => router.push('/caregiver/dashboard')}>
          <img src="/logo.png" alt="VitalSync" style={{ height: 32, width: 'auto', filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.4))' }} />
          <span style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>VitalSync</span>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <ThemeToggle />

          {/* Alerts bell in header */}
          <button
            onClick={() => router.push('/caregiver/alerts')}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
            aria-label="Alerts"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                background: 'var(--danger)', color: '#fff',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => router.push('/caregiver/profile')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#0EA5E9,#22C55E)' }}>
              {user?.name?.[0] || 'C'}
            </div>
          </button>
        </div>
      </header>

      <main className="page-content">
        {children}
      </main>

      <nav className="bottom-nav">
        {NAV.map((item) => {
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
  );
}
