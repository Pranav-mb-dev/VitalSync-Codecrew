'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Edit2, Check, X, User, Phone, Mail, Calendar, Globe } from 'lucide-react';
import { useRouter } from 'next/router';
import api from '../../services/api';

const getAge = (dateOfBirth) => {
  if (!dateOfBirth) return '';
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasBirthdayPassed = today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasBirthdayPassed) age -= 1;
  return age;
};

export default function CaregiverProfile() {
  const { t } = useTranslation();
  const { user, logout, setUser } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState(user || {});
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileData, patientData] = await Promise.all([
        api.get('/profile'),
        api.get('/profile/patient').catch(() => null),
      ]);
      const normalized = {
        ...profile,
        name: profileData.fullName || '',
        email: profileData.email || '',
        phone: profileData.phoneNumber || '',
        dateOfBirth: profileData.dateOfBirth || null,
        language: profileData.language || 'en',
        avatarUrl: profileData.avatarUrl || '',
        emergencyContacts: profileData.emergencyContacts || [],
      };
      setProfile(normalized);
      setUser({ ...user, ...normalized });
      setPatient(patientData);
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    }
  };

  const initials = useMemo(() =>
    profile.name ? profile.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'CG',
    [profile.name]
  );

  const doLogout = () => {
    logout();
    router.replace('/login');
  };

  const startEditing = () => {
    setEditForm({
      fullName: profile.name || '',
      dateOfBirth: profile.dateOfBirth || '',
      phone: profile.phone || '',
      emergencyContacts: profile.emergencyContacts?.join(', ') || '',
      language: profile.language || 'en',
      avatarUrl: profile.avatarUrl || '',
    });
    setIsEditing(true);
    setSuccessMsg('');
    setError('');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        fullName: editForm.fullName,
        dateOfBirth: editForm.dateOfBirth || null,
        phoneNumber: editForm.phone,
        avatarUrl: editForm.avatarUrl,
        language: editForm.language,
        emergencyContacts: editForm.emergencyContacts
          ? editForm.emergencyContacts.split(',').map(i => i.trim()).filter(Boolean)
          : [],
      };
      await api.put('/profile', payload);
      setSuccessMsg(t('profile_updated'));
      setIsEditing(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const formChange = (field, val) => setEditForm(prev => ({ ...prev, [field]: val }));

  // ── Edit mode UI ──
  if (isEditing) {
    return (
      <div className="animate-fade" style={{ paddingBottom: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>{t('edit_profile')}</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={cancelEditing} className="btn btn-ghost" style={{ padding: '8px 12px', color: 'var(--text-muted)' }}><X size={18} /></button>
            <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              {isSaving ? t('saving') : <><Check size={18} /> {t('save')}</>}
            </button>
          </div>
        </div>

        {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="card" style={{ marginBottom: 20 }}>
          <p className="profile-section-title" style={{ marginTop: 0, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{t('identity')}</p>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('full_name')}</label>
            <input type="text" className="input-field" value={editForm.fullName} onChange={e => formChange('fullName', e.target.value)} />
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('date_of_birth')}</label>
            <input type="date" className="input-field" value={editForm.dateOfBirth} onChange={e => formChange('dateOfBirth', e.target.value)} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <p className="profile-section-title" style={{ marginTop: 0, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{t('contact_information')}</p>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('phone_number')}</label>
            <input type="tel" className="input-field" placeholder="+91..." value={editForm.phone} onChange={e => formChange('phone', e.target.value)} />
          </div>
        </div>
      </div>
    );
  }

  // ── View mode UI ──
  return (
    <div className="animate-fade" style={{ paddingBottom: 40 }}>
      {successMsg && <div className="alert-banner alert-success" style={{ marginBottom: 16 }}>{successMsg}</div>}
      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Profile Header */}
      <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(34,197,94,0.1))' }} />

        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-card)', zIndex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#0EA5E9,#22C55E)', fontSize: 32, fontWeight: 800, border: '4px solid var(--bg-card)', zIndex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            {initials}
          </div>
        )}

        <div style={{ zIndex: 1, flex: 1, paddingTop: 10 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{profile.name || 'Caregiver'}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{profile.email}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <span className="pill pill-primary" style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(14,165,233,0.15)', color: '#0EA5E9' }}>Caregiver</span>
            {profile.dateOfBirth && (
              <span className="pill" style={{ background: 'var(--bg-base)', padding: '4px 10px', fontSize: 11 }}>{getAge(profile.dateOfBirth)} yrs</span>
            )}
          </div>
          <button onClick={startEditing} className="btn btn-primary" style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            <Edit2 size={16} /> {t('edit_profile')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

        {/* Contact Information */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 10 }}>
            <p className="profile-section-title" style={{ margin: 0 }}>{t('contact_details')}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                <Phone size={16} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('phone_number')}</p>
                <p style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>{profile.phone || '--'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', flexShrink: 0 }}>
                <Mail size={16} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('email')}</p>
                <p style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>{profile.email || '--'}</p>
              </div>
            </div>

            {profile.dateOfBirth && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E', flexShrink: 0 }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('date_of_birth')}</p>
                  <p style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>
                    {new Date(profile.dateOfBirth).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Linked Patient */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 10 }}>
            <p className="profile-section-title" style={{ margin: 0 }}>{t('linked_patient')}</p>
          </div>

          {patient ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#EF4444,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
                {(patient.fullName || 'P')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 800 }}>{patient.fullName || 'Unknown'}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{patient.email || ''}</p>
                {patient.bloodType && (
                  <span className="pill" style={{ marginTop: 6, display: 'inline-block', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: 11 }}>
                     {t('blood_type')}: {patient.bloodType}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
              <User size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>{t('no_data')}</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>{t('share_code_desc')}</p>
            </div>
          )}
        </div>
      </div>

      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, marginBottom: 16 }}>
          {/* Added Doctor Section */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #0EA5E9, #2563EB)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
              D
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('doctor')}</p>
              <p style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>Dr. Sarah Jenkins</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Cardiologist</p>
            </div>
          </div>
      </div>

      <button className="btn btn-ghost btn-full" onClick={doLogout} style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)', gap: 8, marginTop: 24, padding: 16 }}>
        <LogOut size={18} /> <span style={{ fontWeight: 700 }}>{t('logout')}</span>
      </button>
    </div>
  );
}
