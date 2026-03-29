'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Heart, Mail, Lock, Eye, EyeOff, ArrowRight, Stethoscope, Users, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const ROLES = [
  { id: 'patient', label: 'patient', icon: <UserIcon size={16} /> },
  { id: 'caregiver', label: 'caregiver', icon: <Users size={16} /> },
];

export default function Login() {
  const { t } = useTranslation();
  const { login, loading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const getHomePath = (selectedRole) => selectedRole === 'doctor' ? '/doctor' : `/${selectedRole}/dashboard`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password, role);
    if (result.success) router.push(getHomePath(role));
    else setError(result.error);
  };

  return (
    <div className="auth-screen" style={{ background: 'linear-gradient(135deg, var(--bg-base) 0%, rgba(14, 165, 233, 0.05) 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {/* Decorative blobs */}
      <div style={{ position: 'absolute', width: 300, height: 300, background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)', borderRadius: '50%', top: -100, left: -100, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 250, height: 250, background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)', borderRadius: '50%', bottom: -50, right: -50, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="auth-logo-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(14, 165, 233, 0.2)' }}>
              <Heart fill="white" stroke="none" size={32} />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{t('vitalsync_brand', 'VitalSync')}</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>{t('tagline')}</p>
            </div>
          </div>
          <p className="auth-tagline" style={{ fontSize: 16, marginBottom: 16 }}>{t('welcome_back')}</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, marginBottom: 24 }}>{t('sign_in_access')}</p>

          {/* Role Selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderRadius: 12, background: 'rgba(0, 0, 0, 0.1)', padding: 4 }}>
            {ROLES.map((r) => (
              <button 
                key={r.id} 
                onClick={() => setRole(r.id)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: role === r.id ? 'linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 100%)' : 'transparent',
                  color: role === r.id ? 'white' : 'var(--text-secondary)',
                  fontWeight: role === r.id ? 600 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.3s ease'
                }}
              >
                {r.icon}
                {t(r.label)}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label" style={{ fontWeight: 600, marginBottom: 8 }}>{t('email')}</label>
            <div className="input-icon-wrap" style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
              <Mail size={18} className="input-icon" style={{ color: 'var(--primary)' }} />
              <input 
                className="input" 
                type="email" 
                placeholder={t('email_placeholder')}
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                style={{ 
                  fontSize: 14, 
                  paddingLeft: 40,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  transition: 'all 0.3s ease'
                }}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label" style={{ fontWeight: 600, marginBottom: 8 }}>{t('password')}</label>
            <div className="input-icon-wrap" style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
              <Lock size={18} className="input-icon" style={{ color: 'var(--primary)' }} />
              <input
                className="input"
                type={showPass ? 'text' : 'password'}
                placeholder={t('enter_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  fontSize: 14, 
                  paddingLeft: 40,
                  paddingRight: 44,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  transition: 'all 0.3s ease'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="alert-banner alert-danger" style={{ fontSize: 13, borderRadius: 10, borderLeft: '4px solid var(--danger)' }}>{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary btn-full" 
            disabled={loading}
            style={{
              background: loading ? 'var(--primary-dim)' : 'linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 100%)',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 12,
              padding: '14px 24px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(14, 165, 233, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {loading ? t('signing_in') : <>{t('login')} <ArrowRight size={18} /></>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 24, paddingBottom: 8 }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, marginBottom: 12 }}>
            {t('no_account')}{' '}
            <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', transition: 'opacity 0.3s' }}>
              {t('signup')}
            </Link>
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('health_priority')}</p>
        </div>
      </div>
    </div>
  );
}
