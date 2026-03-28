'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { LogOut, QrCode, ChevronRight, Edit2, Check, X, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

export default function PatientProfile() {
  const { t } = useTranslation();
  const { user, logout, setUser } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState(user || {});
  const [inviteCode, setInviteCode] = useState('');
  const [members, setMembers] = useState([]);
  const [showPair, setShowPair] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileData, memberData] = await Promise.all([
        api.get('/profile'),
        api.get('/family/members'),
      ]);
      const normalized = {
        ...profile,
        name: profileData.fullName || '',
        email: profileData.email || '',
        blood: profileData.bloodType || '',
        phone: profileData.phoneNumber || '',
        conditions: profileData.medicalConditions ? profileData.medicalConditions.split(',').map(i => i.trim()).filter(Boolean) : [],
        allergies: profileData.allergies || '',
        dateOfBirth: profileData.dateOfBirth || null,
        pairCode: profileData.pairCode || '',
        emergencyContacts: profileData.emergencyContacts || [],
        language: profileData.language || 'en',
        avatarUrl: profileData.avatarUrl || '',
      };
      setProfile(normalized);
      setUser({ ...user, ...normalized });
      setInviteCode(profileData.pairCode || '');
      setMembers(memberData.filter((member) => member.status === 'ACTIVE'));
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    }
  };

  const initials = useMemo(() => (
    profile.name ? profile.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'PT'
  ), [profile.name]);

  const doLogout = () => {
    logout();
    router.replace('/login');
  };

  const startEditing = () => {
    setEditForm({
      fullName: profile.name,
      dateOfBirth: profile.dateOfBirth || '',
      bloodType: profile.blood || '',
      phone: profile.phone || '',
      allergies: profile.allergies || '',
      medicalConditions: profile.conditions?.join(', ') || '',
      emergencyContacts: profile.emergencyContacts?.join(', ') || '',
      language: profile.language || 'en',
      avatarUrl: profile.avatarUrl || ''
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
        bloodType: editForm.bloodType,
        allergies: editForm.allergies,
        medicalConditions: editForm.medicalConditions,
        phoneNumber: editForm.phone,
        avatarUrl: editForm.avatarUrl,
        language: editForm.language,
        emergencyContacts: editForm.emergencyContacts ? editForm.emergencyContacts.split(',').map(i => i.trim()).filter(Boolean) : []
      };
      
      await api.put('/profile', payload);
      setSuccessMsg(t('profile_updated'));
      setIsEditing(false);
      await fetchData(); // re-sync
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const formChange = (field, val) => setEditForm(prev => ({ ...prev, [field]: val }));

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('date_of_birth')}</label>
              <input type="date" className="input-field" value={editForm.dateOfBirth} onChange={e => formChange('dateOfBirth', e.target.value)} />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('interface_language')}</label>
              <select className="input-field" value={editForm.language} onChange={e => formChange('language', e.target.value)}>
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <p className="profile-section-title" style={{ marginTop: 0, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{t('medical_information')}</p>
          
          <div className="form-group" style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('blood_type')}</label>
            <select className="input-field" value={editForm.bloodType} onChange={e => formChange('bloodType', e.target.value)}>
              <option value="">{t('select_blood_type')}</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('allergies')}</label>
            <input type="text" className="input-field" placeholder="e.g. Peanuts, Penicillin" value={editForm.allergies} onChange={e => formChange('allergies', e.target.value)} />
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('medical_conditions')}</label>
            <textarea className="input-field" rows={2} placeholder="e.g. Type 2 Diabetes, Hypertension" value={editForm.medicalConditions} onChange={e => formChange('medicalConditions', e.target.value)} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <p className="profile-section-title" style={{ marginTop: 0, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{t('contact_information')}</p>
          
          <div className="form-group" style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('phone_number')}</label>
            <input type="tel" className="input-field" placeholder="+1..." value={editForm.phone} onChange={e => formChange('phone', e.target.value)} />
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('emergency_contacts')}</label>
            <input type="text" className="input-field" placeholder="Comma separated phone numbers" value={editForm.emergencyContacts} onChange={e => formChange('emergencyContacts', e.target.value)} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t('emergency_contacts_hint')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ paddingBottom: 40 }}>
      {successMsg && <div className="alert-banner alert-success" style={{ marginBottom: 16 }}>{successMsg}</div>}
      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="profile-header card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(139, 92, 246, 0.1))' }}></div>
        
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-card)', zIndex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        ) : (
          <div className="avatar" style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#EF4444,#8B5CF6)', fontSize: 32, fontWeight: 800, border: '4px solid var(--bg-card)', zIndex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            {initials}
          </div>
        )}
        
        <div style={{ zIndex: 1, flex: 1, paddingTop: 10 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{profile.name || 'Patient'}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{profile.email}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <span className="pill pill-primary" style={{ padding: '4px 10px', fontSize: 11 }}>Patient</span>
            <span className="pill" style={{ background: 'var(--bg-base)', padding: '4px 10px', fontSize: 11, textTransform: 'uppercase' }}>{profile.language || 'en'}</span>
          </div>
            <button onClick={startEditing} className="btn btn-primary" style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              <Edit2 size={16} /> {t('edit_profile')}
            </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        
        {/* Medical Information */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 10 }}>
            <p className="profile-section-title" style={{ margin: 0 }}>{t('medical_information')}</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('blood_group')}</p>
              <p style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: profile.blood ? 'var(--danger)' : 'var(--text-primary)' }}>{profile.blood || '--'}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('age')}</p>
              <p style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{profile.dateOfBirth ? `${getAge(profile.dateOfBirth)} ${t('yrs')}` : '--'}</p>
            </div>
          </div>
          
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('medical_conditions')}</p>
            {profile.conditions?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {profile.conditions.map((c, i) => <span key={i} className="pill" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: 12 }}>{c}</span>)}
              </div>
            ) : <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{t('none_recorded')}</p>}
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('allergies')}</p>
            <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{profile.allergies || t('none_recorded')}</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 10 }}>
            <p className="profile-section-title" style={{ margin: 0 }}>{t('contact_details')}</p>
          </div>
          
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('phone_number')}</p>
            <p style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{profile.phone || '--'}</p>
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('emergency_contacts')}</p>
            {profile.emergencyContacts?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {profile.emergencyContacts.map((c, i) => <p key={i} style={{ fontSize: 14, fontWeight: 500 }}>{c}</p>)}
              </div>
            ) : <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2, color: 'var(--text-muted)' }}>{t('no_emergency_contacts')}</p>}
          </div>
        </div>

      </div>

      <div style={{ marginTop: 20 }}>
        <p className="profile-section-title">{t('caregiver_access')}</p>
        <div className="card" style={{ marginBottom: 16, cursor: 'pointer', padding: 20 }} onClick={() => setShowPair(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              <QrCode size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700 }}>{t('your_patient_code')}</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{t('share_code_desc')}</p>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--primary)', margin: 0 }}>{inviteCode || '--'}</p>
            </div>
          </div>
        </div>

        {members.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {members.map((member) => (
              <div key={member.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                  {member.caregiverName ? member.caregiverName[0].toUpperCase() : 'C'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('caretaker')}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{member.caregiverName || 'Unknown'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {/* Added Doctor Section */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #0EA5E9, #2563EB)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
              D
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Doctor</p>
              <p style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>Dr. Sarah Jenkins</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Cardiologist</p>
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-ghost btn-full" onClick={doLogout} style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)', gap: 8, marginTop: 12, padding: 16 }}>
        <LogOut size={18} /> <span style={{ fontWeight: 700 }}>{t('logout')}</span>
      </button>

      {showPair && (
        <div className="modal-overlay" onClick={() => setShowPair(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>{t('secure_access_code')}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 30, textAlign: 'center', maxWidth: 280, margin: '0 auto 24px' }}>{t('share_caregiver_desc')}</p>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ display: 'inline-block', background: 'var(--bg-base)', padding: '24px 40px', borderRadius: 24, border: '2px dashed var(--border)' }}>
                <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '0.25em', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' }}>
                  {inviteCode || '----'}
                </div>
              </div>
            </div>
            <button className="btn btn-primary btn-full" style={{ padding: 16, fontSize: 16, fontWeight: 700 }} disabled={!inviteCode} onClick={() => { navigator.clipboard?.writeText(inviteCode); setShowPair(false); }}>{t('copy_code')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
