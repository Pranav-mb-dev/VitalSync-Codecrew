'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Heart, User, Users, Lock, Mail, Eye, EyeOff, ArrowRight, CheckCircle2, Link2 } from 'lucide-react';
import { useAuth } from '../../src/context/AuthContext';
import ThemeToggle from '../../src/components/ThemeToggle';
import LanguageSwitcher from '../../src/components/LanguageSwitcher';

const ROLES = [
  { id: 'patient', icon: <Heart size={24} />, color: '#EF4444', bg: 'rgba(239,68,68,0.12)', key: 'patient', desc_key: 'patient_desc' },
  { id: 'caregiver', icon: <Users size={24} />, color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)', key: 'caregiver', desc_key: 'caregiver_desc' },
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
    setError('');
    if (!form.name || !form.email || !form.password) {
      setError(t('fill_all_fields'));
      return;
    }
    if (role === 'caregiver' && !form.pairCode.trim()) {
      setError(t('caregiver_pair_required'));
      return;
    }

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
        <div className="auth-logo"><Heart fill="#0EA5E9" stroke="none" size={32} />{t('vitalsync_brand', 'VitalSync')}</div>
        <p className="auth-tagline">{t('tagline')}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('role')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ROLES.map((r) => (
              <div key={r.id} className={`role-card ${role === r.id ? 'selected' : ''}`} onClick={() => setRole(r.id)}>
                <div className="role-card-icon" style={{ background: r.bg, color: r.color }}>{r.icon}</div>
                <div className="role-card-body"><h3>{t(r.key)}</h3><p>{t(r.desc_key)}</p></div>
                {role === r.id && <CheckCircle2 size={20} color="var(--primary)" />}
              </div>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">{t('name')}</label>
          <div className="input-icon-wrap">
            <User size={16} className="input-icon" />
            <input className="input" placeholder={t('your_full_name')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
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
            <input
              className="input"
              type={showPass ? 'text' : 'password'}
              placeholder={t('min_8_chars')}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <div className="alert-banner alert-danger" style={{ fontSize: 13 }}>{error}</div>}

        <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? t('creating_account') : <>{t('signup')} <ArrowRight size={18} /></>}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 24, paddingBottom: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
        {t('already_account')}{' '}
        <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('login')}</Link>
      </div>
    </div>
  );
}
