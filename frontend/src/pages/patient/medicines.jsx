'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, CheckCircle2, X, Camera, Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import Skeleton from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

const NOONS = ['morning', 'afternoon', 'evening', 'night'];
const NOON_EMOJI = { morning: 'Sunrise', afternoon: 'Sun', evening: 'Sunset', night: 'Moon' };

export default function Medicines() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isCaregiver = user?.role === 'caregiver';
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const defaultForm = { name: '', dosage: '', sessions: ['morning'], instructions: 'After Food', durationDays: 30 };
  const [form, setForm] = useState(defaultForm);
  const fileInputRef = useRef(null);

  const fetchMeds = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/medications');
      setMeds(data);
    } catch (err) {
      console.warn(err);
      setError(t('loading_medicines'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeds();
  }, []);

  const totalScheduledSessions = meds.reduce((total, m) => total + (m.frequency ? m.frequency.split(',').filter(f => f.trim()).length : 1), 0);
  const totalLoggedSessions = meds.reduce((total, m) => total + (m.takenSessionsToday ? m.takenSessionsToday.length : 0), 0);
  const dailyProgressPercent = totalScheduledSessions > 0 ? Math.round((totalLoggedSessions / totalScheduledSessions) * 100) : 0;

  const log = async (med, session) => {
    if (!window.confirm(`${t('log')} ${t(session)} dose for ${med.name}?`)) return;
    try {
      await api.post(`/medications/${med.id}/log?session=${session}`, {});
      setMeds((prev) => prev.map((m) => m.id === med.id ? { ...m, takenSessionsToday: [...(m.takenSessionsToday || []), session], lastTakenAt: new Date().toISOString() } : m));
    } catch (err) {
      alert(t('loading_medicines'));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      setError('');
      
      const payload = {
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.sessions.join(','),
        instructions: form.instructions.trim(),
        startDate: new Date().toISOString().split('T')[0],
        totalDays: parseInt(form.durationDays || 30),
        daysLeft: parseInt(form.durationDays || 30),
      };
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(form.durationDays || 30));
      payload.endDate = endDate.toISOString().split('T')[0];

      if (editingId) {
        const updated = await api.put(`/medications/${editingId}`, payload);
        setMeds(prev => prev.map(m => m.id === editingId ? updated : m));
      } else {
        const created = await api.post('/medications', payload);
        setMeds(prev => [...prev, created]);
      }
      
      closeForm();
    } catch (err) {
      setError(err.message || 'Failed to save medicine');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('delete') + '?')) return;
    try {
      await api.delete(`/medications/${id}`);
      setMeds(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert('Failed to delete medication.');
    }
  };

  const handleScanUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScanning(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);
      
      const newlyAdded = await api.post('/medications/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMeds(prev => [...prev, ...newlyAdded]);
    } catch (err) {
      setError(err.message || 'Failed to process prescription. Try adding manually.');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openEdit = (med) => {
    const activeSessions = med.frequency ? med.frequency.split(',').map(s => s.trim().toLowerCase()) : ['morning'];
    let dur = 30;
    if (med.startDate && med.endDate) {
      const s = new Date(med.startDate);
      const e = new Date(med.endDate);
      dur = Math.round((e - s) / (1000 * 60 * 60 * 24)) || 30;
    }
    
    setForm({
      name: med.name,
      dosage: med.dosage || '',
      sessions: activeSessions,
      instructions: med.instructions || 'After Food',
      durationDays: dur
    });
    setEditingId(med.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const toggleSession = (session) => {
    setForm(f => ({
      ...f,
      sessions: f.sessions.includes(session) 
        ? f.sessions.filter(s => s !== session)
        : [...f.sessions, session]
    }));
  };

  const getProgress = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const now = new Date().getTime();
    if (now >= e) return 100;
    if (now <= s) return 0;
    return Math.round(((now - s) / (e - s)) * 100);
  };

  const isSessionActive = (med, session) => {
    const freqs = med.frequency ? med.frequency.toLowerCase() : '';
    return freqs.includes(session.toLowerCase());
  };

  const getDaysLeft = (end) => {
    if (!end) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const e = new Date(end);
    e.setHours(0,0,0,0);
    const diff = Math.ceil((e - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('medicines')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{totalLoggedSessions}/{totalScheduledSessions} {t('sessions_logged_today')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()} style={{ gap: 5, padding: '8px 12px' }} disabled={scanning}>
            <Camera size={16} color="var(--primary)" /> {t('scan_rx')}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleScanUpload} accept="image/*, application/pdf" capture="environment" style={{ display: 'none' }} />
          
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ gap: 5 }}>
            <Plus size={14} /> {t('add')}
          </button>
        </div>
      </div>

      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
      {scanning && <div className="alert-banner alert-info" style={{ marginBottom: 16 }}>{t('scanning_ai')}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('daily_progress')}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{dailyProgressPercent}%</span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${dailyProgressPercent}%` }} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Skeleton variant="rect" width="44px" height="44px" style={{ borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" width="40%" height="20px" />
                  <Skeleton variant="text" width="60%" height="14px" />
                </div>
              </div>
              <Skeleton variant="button" width="100px" style={{ marginTop: 16 }} />
            </div>
          ))}
        </div>
      ) : meds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p>{t('no_medicines')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {NOONS.map(session => {
            const activeMedsForSession = meds.filter(m => isSessionActive(m, session));
            if (activeMedsForSession.length === 0) return null;
            
            return (
              <div key={session}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }}></div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>{NOON_EMOJI[session]} {t(session)}</h2>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activeMedsForSession.map((med) => {
                    const isLogged = med.takenSessionsToday?.includes(session) || false;
                    return (
                    <div key={`${session}-${med.id}`} className="card animate-in" style={{ padding: '16px', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: isLogged ? 'rgba(34,197,94,0.12)' : 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            Rx
                          </div>
                          <div>
                            <p style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {med.name}
                              {(med.daysLeft !== undefined || med.endDate) && (
                                <span className="pill" style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' }}>   
                                  {med.daysLeft !== undefined ? med.daysLeft : getDaysLeft(med.endDate)} {t('days_left')}
                                </span>
                              )}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                              {med.instructions || ''}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEdit(med)} style={{ background: 'none', border: 'none', padding: 6, color: 'var(--text-secondary)' }}><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(med.id)} style={{ background: 'none', border: 'none', padding: 6, color: 'var(--danger)' }}><Trash2 size={15} /></button>
                        </div>
                      </div>

                      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        {isCaregiver ? (
                          isLogged && <span className="pill pill-success"><CheckCircle2 size={11} /> {t('taken')}</span>
                        ) : (
                          <button
                            className={`log-btn ${isLogged ? 'log-btn-done' : 'log-btn-active'}`}
                            onClick={() => !isLogged && log(med, session)}
                            disabled={isLogged}
                            style={{ minWidth: 90 }}
                          >
                            {isLogged ? <><CheckCircle2 size={13} /> {t('done')}</> : t('log_intake')}
                          </button>
                        )}
                      </div>

                    </div>
                  )})}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{editingId ? t('edit_medicine') : t('add_medicine')}</h3>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('medicine_name')}</label>
                <input className="input-field" placeholder="e.g. Paracetamol" style={{ marginTop: 0 }} value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('duration_days')}</label>
                <input type="number" className="input-field" style={{ marginTop: 0 }} min="1" value={form.durationDays} onChange={(e) => setForm(f => ({ ...f, durationDays: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('timing_instructions')}</label>
                <select className="input-field" style={{ marginTop: 0 }} value={form.instructions} onChange={(e) => setForm(f => ({ ...f, instructions: e.target.value }))}>
                  <option value="Before Food">{t('before_food')}</option>
                  <option value="After Food">{t('after_food')}</option>
                  <option value="With Food">{t('with_food')}</option>
                  <option value="Fasting">{t('fasting')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 8 }}>{t('active_sessions')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {NOONS.map((n) => (
                    <label key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-card)', border: `1px solid ${form.sessions.includes(n) ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)' }}>
                      <input 
                        type="checkbox" 
                        checked={form.sessions.includes(n)} 
                        onChange={() => toggleSession(n)} 
                        style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{t(n)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
                {saving ? t('saving') : t('save_medication')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
