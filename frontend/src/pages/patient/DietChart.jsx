'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, CheckCircle2, X, Camera, Trash2, Edit2, Sparkles, Coffee } from 'lucide-react';
import api from '../../services/api';
import Skeleton from '../../components/Skeleton';
import { useAuth } from '../../context/AuthContext';

const NOONS = ['morning', 'afternoon', 'evening', 'night'];
const NOON_EMOJI = { morning: 'Sunrise', afternoon: 'Sun', evening: 'Sunset', night: 'Moon' };

export default function DietChart() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isCaregiver = user?.role === 'caregiver';
  const [diets, setDiets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const defaultForm = { name: '', description: '', sessions: ['morning'], durationDays: 30 };
  const [form, setForm] = useState(defaultForm);
  const fileInputRef = useRef(null);

  const fetchDiets = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/diet');
      setDiets(data);
    } catch (err) {
      console.warn(err);
      setError('Failed to load diet plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiets();
  }, []);

  const totalScheduledSessions = diets.reduce((total, d) => total + (d.frequency ? d.frequency.split(',').filter(f => f.trim()).length : 1), 0);
  const totalLoggedSessions = diets.reduce((total, d) => total + (d.takenSessionsToday ? d.takenSessionsToday.length : 0), 0);
  const dailyProgressPercent = totalScheduledSessions > 0 ? Math.round((totalLoggedSessions / totalScheduledSessions) * 100) : 0;

  const log = async (diet, session) => {
    if (!window.confirm(`${t('log_meal')} ${session} ${diet.name}?`)) return;
    try {
      await api.post(`/diet/${diet.id}/log?session=${session}`, {});
      setDiets((prev) => prev.map((d) => d.id === diet.id ? { ...d, takenSessionsToday: [...(d.takenSessionsToday || []), session], lastTakenAt: new Date().toISOString() } : d));
    } catch (err) {
      alert('Failed to log diet');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      setError('');
      
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        frequency: form.sessions.join(','),
        startDate: new Date().toISOString().split('T')[0],
        totalDays: parseInt(form.durationDays || 30),
        daysLeft: parseInt(form.durationDays || 30),
      };
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(form.durationDays || 30));
      payload.endDate = endDate.toISOString().split('T')[0];

      if (editingId) {
        const updated = await api.put(`/diet/${editingId}`, payload);
        setDiets(prev => prev.map(d => d.id === editingId ? updated : d));
      } else {
        const created = await api.post('/diet', payload);
        setDiets(prev => [...prev, created]);
      }
      
      closeForm();
    } catch (err) {
      setError(err.message || 'Failed to save diet item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('delete') + '?')) return;
    try {
      await api.delete(`/diet/${id}`);
      setDiets(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert('Failed to delete diet item.');
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
      
      const newlyAdded = await api.post('/diet/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setDiets(prev => [...prev, ...newlyAdded]);
    } catch (err) {
      setError(err.message || 'Failed to process chart. Try adding manually.');
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateAI = async () => {
    try {
      setGenerating(true);
      setError('');
      const newlyAdded = await api.post('/diet/generate', {});
      setDiets(prev => [...prev, ...newlyAdded]);
    } catch (err) {
      setError(err.message || 'Failed to generate diet plan.');
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (diet) => {
    const activeSessions = diet.frequency ? diet.frequency.split(',').map(s => s.trim().toLowerCase()) : ['morning'];
    let dur = 30;
    if (diet.startDate && diet.endDate) {
      const s = new Date(diet.startDate);
      const e = new Date(diet.endDate);
      dur = Math.round((e - s) / (1000 * 60 * 60 * 24)) || 30;
    }
    
    setForm({
      name: diet.name,
      description: diet.description || '',
      sessions: activeSessions,
      durationDays: dur
    });
    setEditingId(diet.id);
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

  const isSessionActive = (diet, session) => {
    const freqs = diet.frequency ? diet.frequency.toLowerCase() : '';
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

  const getSessionLabel = (session) => {
    const map = { morning: t('breakfast_morning'), afternoon: t('lunch_afternoon'), evening: t('snack_evening'), night: t('dinner_night') };
    return map[session] || t(session);
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('diet')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{totalLoggedSessions}/{totalScheduledSessions} {t('meals_followed_today')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleGenerateAI} disabled={generating || scanning} style={{ gap: 5, padding: '8px 12px' }}>
            <Sparkles size={16} color="var(--primary)" /> {t('generate_with_ai')}
          </button>
          
          <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()} style={{ gap: 5, padding: '8px 12px' }} disabled={scanning || generating}>
            <Camera size={16} color="var(--primary)" /> {t('scan_chart')}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleScanUpload} accept="image/*, application/pdf" capture="environment" style={{ display: 'none' }} />
          
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ gap: 5 }}>
            <Plus size={14} /> {t('add')}
          </button>
        </div>
      </div>

      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
      {scanning && <div className="alert-banner alert-info" style={{ marginBottom: 16 }}>{t('scanning_diet_ai')}</div>}
      {generating && <div className="alert-banner alert-info" style={{ marginBottom: 16 }}>{t('generating_meal')}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('daily_diet_progress')}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{dailyProgressPercent}%</span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${dailyProgressPercent}%`, background: 'linear-gradient(90deg, #10b981, #059669)' }} />
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
      ) : diets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p>{t('no_diet')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {NOONS.map(session => {
            const activeDietsForSession = diets.filter(d => isSessionActive(d, session));
            if (activeDietsForSession.length === 0) return null;
            
            return (
              <div key={session}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>{NOON_EMOJI[session]} {getSessionLabel(session)}</h2>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activeDietsForSession.map((diet) => {
                    const isLogged = diet.takenSessionsToday?.includes(session) || false;
                    return (
                    <div key={`${session}-${diet.id}`} className="card animate-in" style={{ padding: '16px', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: isLogged ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isLogged ? '#10b981' : '#eab308' }}>
                            <Coffee size={20} />
                          </div>
                          <div>
                            <p style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {diet.name}
                              {(diet.daysLeft !== undefined || diet.endDate) && (
                                <span className="pill" style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04' }}>   
                                  {diet.daysLeft !== undefined ? diet.daysLeft : getDaysLeft(diet.endDate)} {t('days_left')}
                                </span>
                              )}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                              {diet.description || ''}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEdit(diet)} style={{ background: 'none', border: 'none', padding: 6, color: 'var(--text-secondary)' }}><Edit2 size={15} /></button>
                          <button onClick={() => handleDelete(diet.id)} style={{ background: 'none', border: 'none', padding: 6, color: 'var(--danger)' }}><Trash2 size={15} /></button>
                        </div>
                      </div>

                      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        {isCaregiver ? (
                          isLogged && <span className="pill pill-success"><CheckCircle2 size={11} /> {t('followed')}</span>
                        ) : (
                          <button
                            className={`log-btn ${isLogged ? 'log-btn-done' : 'log-btn-active'}`}
                            onClick={() => !isLogged && log(diet, session)}
                            disabled={isLogged}
                            style={{ minWidth: 90, background: isLogged ? undefined : '#10b981', color: isLogged ? undefined : '#fff' }}
                          >
                            {isLogged ? <><CheckCircle2 size={13} /> {t('followed')}</> : t('log_meal_btn')}
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
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{editingId ? t('edit_diet_item') : t('add_diet_item')}</h3>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('meal_name')}</label>
                <input className="input-field" placeholder="e.g. Oatmeal with Fruits" style={{ marginTop: 0 }} value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('description_portion')}</label>
                <input className="input-field" placeholder="e.g. 1 bowl, no added sugar" style={{ marginTop: 0 }} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('duration_days')}</label>
                <input type="number" className="input-field" style={{ marginTop: 0 }} min="1" value={form.durationDays} onChange={(e) => setForm(f => ({ ...f, durationDays: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 8 }}>{t('active_sessions')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {NOONS.map((n) => (
                    <label key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-card)', border: `1px solid ${form.sessions.includes(n) ? '#10b981' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)' }}>
                      <input 
                        type="checkbox" 
                        checked={form.sessions.includes(n)} 
                        onChange={() => toggleSession(n)} 
                        style={{ accentColor: '#10b981', width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{t(n)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving} style={{ marginTop: 8, background: '#10b981', color: 'white' }}>
                {saving ? t('saving') : t('save_diet_item')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
