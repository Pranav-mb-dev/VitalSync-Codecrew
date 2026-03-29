import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Heart, User, Users, Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2, Link2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useState } from 'react';

const ROLES = [
  { id: 'patient', icon: <Heart size={24} />, color: '#EF4444', bg: 'rgba(239,68,68,0.12)', key: 'patient', desc: 'Monitor your health journey' },
  { id: 'caregiver', icon: <Users size={24} />, color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)', key: 'caregiver', desc: 'Care for your loved ones' },
];

export default function Signup() {
  const { t } = useTranslation();
  const { signup, loading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ name: '', email: '', password: '', pairCode: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError(t('fill_all_fields')); return; }
    if (role === 'caregiver' && !form.pairCode.trim()) { setError(t('caregiver_pair_required')); return; }
    const result = await signup({ ...form, role });
    if (result.success) router.push(`/${role}/dashboard`);
    else setError(result.error);
  };

  return (
    <div className="auth-screen">
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="auth-logo-section">
        <div className="auth-logo">
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <img src="/logo.png" alt="VitalSync" style={{ height: 80, width: 'auto', filter: 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.3))' }} />
        </div>
          VitalSync
        </div>
        <p className="auth-tagline">{t('tagline')}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Removed role selection cards per user request */}

        <div className="input-group">
          <label className="input-label">{t('name')}</label>
          <div className="input-icon-wrap">
            <User size={16} className="input-icon" />
            <input className="input" placeholder="Your full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">{t('email')}</label>
          <div className="input-icon-wrap">
            <Mail size={16} className="input-icon" />
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
        </div>

        {role === 'caregiver' && (
          <div className="input-group">
            <label className="input-label">{t('patient_pair_code')}</label>
            <div className="input-icon-wrap">
              <Link2 size={16} className="input-icon" />
              <input className="input" placeholder="8-character code" value={form.pairCode} onChange={(e) => setForm((f) => ({ ...f, pairCode: e.target.value.toUpperCase() }))} />
            </div>
          </div>
        )}

        <div className="input-group">
          <label className="input-label">{t('password')}</label>
          <div className="input-icon-wrap">
            <Lock size={16} className="input-icon" />
            <input className="input" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPass((s) => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <div className="alert-banner alert-danger" style={{ fontSize: 18 }}>{error}</div>}

        <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? t('creating_account') : <>{t('signup')} <ArrowRight size={18} /></>}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 24, paddingBottom: 8, fontSize: 18, color: 'var(--text-secondary)' }}>
        {t('already_account')} {' '}
        <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('login')}</Link>
      </div>
    </div>
  );
}
