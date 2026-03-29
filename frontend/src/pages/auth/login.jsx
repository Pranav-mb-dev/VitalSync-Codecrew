import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import { Heart, Mail, Lock, Eye, EyeOff, ArrowRight, Stethoscope, Users, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useState } from 'react';


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
    <div className="auth-screen">
      <Head>
        <title>Login | VitalSync</title>
      </Head>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="auth-logo-section" style={{ marginBottom: 24 }}>
        <div className="auth-logo">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <img src="/logo.png" alt="VitalSync" style={{ height: 64, width: 'auto', filter: 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.3))' }} />
          </div>
          <span style={{ fontSize: 28 }}>VitalSync</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>Welcome back</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Sign in to access your health dashboard</p>
      </div>

      <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '12px', padding: '6px', marginBottom: '32px', border: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => setRole('patient')}
          style={{
            flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontWeight: 600, fontSize: '15px', transition: 'all 0.2s',
            background: role === 'patient' ? 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)' : 'transparent',
            color: role === 'patient' ? '#fff' : 'var(--text-secondary)',
            boxShadow: role === 'patient' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
          }}
        >
          <UserIcon size={18} /> Patient
        </button>
        <button
          type="button"
          onClick={() => setRole('caregiver')}
          style={{
            flex: 1, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontWeight: 600, fontSize: '15px', transition: 'all 0.2s',
            background: role === 'caregiver' ? 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)' : 'transparent',
            color: role === 'caregiver' ? '#fff' : 'var(--text-secondary)',
            boxShadow: role === 'caregiver' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
          }}
        >
          <Users size={18} /> Caregiver
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="input-group">
          <label className="input-label">{t('email')}</label>
          <div className="input-icon-wrap">
            <Mail size={16} className="input-icon" />
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">{t('password')}</label>
          <div className="input-icon-wrap">
            <Lock size={16} className="input-icon" />
            <input className="input" type={showPass ? 'text' : 'password'} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPass((s) => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <div className="alert-banner alert-danger" style={{ fontSize: 18 }}>{error}</div>}

        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? t('signing_in') : <>{t('login')} <ArrowRight size={18} /></>}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 24, paddingBottom: 8, fontSize: 18, color: 'var(--text-secondary)' }}>
        {t('no_account')} {' '}
        <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('signup')}</Link>
      </div>
    </div>
  );
}
