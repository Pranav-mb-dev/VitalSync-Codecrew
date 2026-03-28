'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Heart, Users, User } from 'lucide-react';
import { useAuth } from '../../src/context/AuthContext';
import ThemeToggle from '../../src/components/ThemeToggle';
import LanguageSwitcher from '../../src/components/LanguageSwitcher';
import VoiceMicButton from '../../src/components/voice/VoiceMicButton';
import VoiceOverlay from '../../src/components/voice/VoiceOverlay';
import Link from 'next/link';

const NAV = [
  { key: 'patients', icon: Users, path: '/doctor/patients' },
  { key: 'profile', icon: User, path: '/doctor/profile' },
];

export default function DoctorLayout({ children }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'doctor') router.replace(`/${user.role}/dashboard`);      
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'doctor') return null;
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-logo"><Heart fill="#0EA5E9" stroke="none" size={20} />VitalSync</div>
        <div className="header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/doctor/profile" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none' }}>
            <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#22C55E,#0EA5E9)' }}>
              {user?.name?.replace('Dr. ', '')?.[0] || 'N'}
            </div>
          </Link>
        </div>
      </header>
      <main className="page-content">{children}</main>
      <VoiceMicButton />
      <VoiceOverlay />
      <nav className="bottom-nav">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.path);
          return (
            <Link key={item.key} href={item.path} className={`nav-item ${active ? 'active' : ''}`} style={{ textDecoration: 'none', minWidth: 100 }}>
              <div className="nav-item-icon"><Icon size={22} /></div>
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
