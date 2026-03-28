'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import api from '../../services/api';

export default function DoctorProfile() {
  const { t } = useTranslation();
  const { user, logout, setUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(user || {});
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get('/profile');
        const normalized = {
          ...profile,
          name: data.fullName || '',
          email: data.email || '',
          phone: data.phoneNumber || '',
        };
        setProfile(normalized);
        setUser(normalized);
      } catch (err) {
        setError(err.message || 'Failed to load doctor profile');
      }
    };

    fetchProfile();
  }, []);

  const initials = useMemo(() => profile.name ? profile.name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('') : 'DR', [profile.name]);

  const doLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="animate-fade">
      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="profile-header">
        <div className="avatar avatar-xl" style={{ background: 'linear-gradient(135deg,#22C55E,#0EA5E9)', fontSize: 28 }}>{initials}</div>
        <div>
          <h2 className="profile-name">{profile.name || 'Doctor'}</h2>
          <p className="profile-role">Authenticated via backend profile</p>
          <span className="pill pill-success" style={{ marginTop: 6 }}>Doctor</span>
        </div>
      </div>

      <p className="profile-section-title" style={{ marginTop: 8 }}>Professional Info</p>
      <div className="card" style={{ marginBottom: 16 }}>
        {[
          { label: 'Email', value: profile.email || 'Not set' },
          { label: 'Phone', value: profile.phone || 'Not set' },
        ].map((item, index) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: index < 1 ? '1px solid var(--border)' : 'none' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, marginTop: 1 }}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        Doctor-specific code sharing and patient linking have not been implemented in the backend yet, so this profile only shows authenticated account data.
      </div>

      <button className="btn btn-ghost btn-full" onClick={doLogout} style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)', gap: 8 }}>
        <LogOut size={16} /> {t('logout')}
      </button>
    </div>
  );
}
