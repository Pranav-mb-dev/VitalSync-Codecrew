'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, Plus, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_APPOINTMENT = {
  title: '',
  doctorName: '',
  appointmentDateTime: '',
  location: '',
  notes: '',
};

const DEFAULT_HABIT = {
  title: '',
  timeOfDay: '',
};

const getCurrentNoon = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'night';
};

const matchesNoon = (timeOfDay = '', currentNoon) => {
  const value = timeOfDay.toLowerCase();
  if (!value) return true;
  if (currentNoon === 'morning') return value.includes('morning') || value.includes('am');
  if (currentNoon === 'afternoon') return value.includes('afternoon') || value.includes('noon') || value.includes('pm');
  return value.includes('night') || value.includes('evening');
};

export default function RemindersPage() {
  const { t } = useTranslation();
  const currentNoon = getCurrentNoon();
  const { user } = useAuth();
  const isCaregiver = user?.role === 'caregiver';
  const [appointments, setAppointments] = useState([]);
  const [habits, setHabits] = useState([]);
  const [appointmentForm, setAppointmentForm] = useState(DEFAULT_APPOINTMENT);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [habitForm, setHabitForm] = useState(DEFAULT_HABIT);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [savingHabit, setSavingHabit] = useState(false);
  const [generatingHabits, setGeneratingHabits] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [appointmentData, habitData] = await Promise.all([
        api.get('/appointments'),
        api.get('/habits'),
      ]);
      setAppointments(appointmentData);
      setHabits(habitData);
    } catch (err) {
      setError(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedAppointments = useMemo(() => {
    const now = new Date();
    return [...appointments]
      .filter((a) => new Date(a.appointmentDateTime) >= now)
      .sort((a, b) => new Date(a.appointmentDateTime) - new Date(b.appointmentDateTime));
  }, [appointments]);
  const currentNoonHabits = useMemo(
    () => habits.filter((habit) => matchesNoon(habit.timeOfDay, currentNoon)),
    [habits, currentNoon]
  );

  const saveAppointment = async () => {
    if (!appointmentForm.title || !appointmentForm.appointmentDateTime) return;
    try {
      setSavingAppointment(true);
      setError('');
      if (editingAppointmentId) {
        const updated = await api.put(`/appointments/${editingAppointmentId}`, appointmentForm);
        setAppointments((prev) => prev.map(a => a.id === editingAppointmentId ? updated : a));
        setEditingAppointmentId(null);
      } else {
        const created = await api.post('/appointments', appointmentForm);
        setAppointments((prev) => [...prev, created]);
      }
      setAppointmentForm(DEFAULT_APPOINTMENT);
      setShowAppointmentForm(false);
    } catch (err) {
      setError(err.message || 'Failed to save appointment');
    } finally {
      setSavingAppointment(false);
    }
  };

  const editAppointment = (apt) => {
    let dateStr = apt.appointmentDateTime;
    // ensure date-time local format yyyy-MM-ddThh:mm
    if (dateStr) {
      const d = new Date(dateStr);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      dateStr = d.toISOString().slice(0, 16);
    }
    setAppointmentForm({
      title: apt.title,
      doctorName: apt.doctorName || '',
      appointmentDateTime: dateStr || '',
      location: apt.location || '',
      notes: apt.notes || '',
    });
    setEditingAppointmentId(apt.id);
    setShowAppointmentForm(true);
  };

  const deleteAppointment = async (id) => {
    if (!window.confirm(t('delete_appointment_confirm'))) return;
    try {
      await api.delete(`/appointments/${id}`);
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert('Failed to delete appointment');
    }
  };

  const addHabit = async () => {
    if (!habitForm.title) return;
    try {
      setSavingHabit(true);
      setError('');
      const created = await api.post('/habits', {
        title: habitForm.title,
        timeOfDay: habitForm.timeOfDay,
      });
      setHabits((prev) => [...prev, created]);
      setHabitForm(DEFAULT_HABIT);
      setShowHabitForm(false);
    } catch (err) {
      setError(err.message || 'Failed to add habit');
    } finally {
      setSavingHabit(false);
    }
  };

  const logHabit = async (habit) => {
    if (habit.completed) return;
    if (!window.confirm(`${t('log_habit')} "${habit.title}"?`)) return;
    try {
      setError('');
      const updated = await api.patch(`/habits/${habit.id}`, { completed: true });
      setHabits((prev) => prev.map((item) => (item.id === habit.id ? updated : item)));
      window.alert(t('logged'));
    } catch (err) {
      setError(err.message || 'Failed to log habit');
    }
  };

  const generateHabits = async () => {
    try {
      setGeneratingHabits(true);
      setError('');
      const generated = await api.post('/habits/generate', {});
      setHabits(generated);
    } catch (err) {
      setError(err.message || 'Failed to generate habits');
    } finally {
      setGeneratingHabits(false);
    }
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('reminders')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('appointments')} & {t('habits')}</p>
      </div>

      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="section-header">
        <span className="section-title"><CalendarDays size={14} /> {t('appointments')}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAppointmentForm(true)} style={{ padding: '6px 12px' }}>
          <Plus size={14} /> {t('add')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {loading ? (
          <div className="card">{t('loading')}</div>
        ) : sortedAppointments.length === 0 ? (
          <div className="card">{t('no_data')}</div>
        ) : (
          sortedAppointments.map((appointment) => (
            <div key={appointment.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <CalendarDays size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700 }}>{appointment.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(appointment.appointmentDateTime).toLocaleString()}
                </p>
                {(appointment.doctorName || appointment.location) && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {[appointment.doctorName, appointment.location].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => editAppointment(appointment)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>{t('edit')}</button>
                <button onClick={() => deleteAppointment(appointment.id)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--danger)' }}>{t('delete')}</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-header">
        <span className="section-title"><Bell size={14} /> {t('habits')}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowHabitForm(true)} style={{ padding: '6px 12px' }}>
          <Plus size={14} /> {t('add')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div className="card">{t('loading')}</div>
        ) : currentNoonHabits.length === 0 ? (
          <div className="card">{t('no_data')}</div>
        ) : (
          currentNoonHabits.map((habit) => (
            <div key={habit.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: habit.completed ? 0.65 : 1 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700, textDecoration: habit.completed ? 'line-through' : 'none' }}>{habit.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {habit.timeOfDay || t('any_time')}{habit.aiGenerated ? ' · AI' : ''}
                </p>
              </div>
              {habit.completed ? (
                <span className="pill pill-success" style={{ opacity: 0.8 }}><CheckCircle2 size={12} style={{ marginRight: 4 }} /> {t('logged')}</span>
              ) : isCaregiver ? null : (
                <button
                  className="log-btn log-btn-active"
                  onClick={() => logHabit(habit)}
                  disabled={habit.completed}
                  style={{ minWidth: 80, background: '#8B5CF6', color: '#fff' }}
                >
                  {t('log')}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showAppointmentForm && (
        <div className="modal-overlay" onClick={() => { setShowAppointmentForm(false); setEditingAppointmentId(null); setAppointmentForm(DEFAULT_APPOINTMENT); }}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{editingAppointmentId ? t('edit') : t('add')} {t('appointments')}</h3>
              <button onClick={() => { setShowAppointmentForm(false); setEditingAppointmentId(null); setAppointmentForm(DEFAULT_APPOINTMENT); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('appointment_title')}</label>
                <input className="input" placeholder="Appointment title" value={appointmentForm.title} onChange={(e) => setAppointmentForm((prev) => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('doctor_name')}</label>
                <input className="input" placeholder="Doctor name" value={appointmentForm.doctorName} onChange={(e) => setAppointmentForm((prev) => ({ ...prev, doctorName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('date_time')}</label>
                <input className="input" type="datetime-local" value={appointmentForm.appointmentDateTime} onChange={(e) => setAppointmentForm((prev) => ({ ...prev, appointmentDateTime: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('location')}</label>
                <input className="input" placeholder="Location" value={appointmentForm.location} onChange={(e) => setAppointmentForm((prev) => ({ ...prev, location: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('notes')}</label>
                <input className="input" placeholder="Notes" value={appointmentForm.notes} onChange={(e) => setAppointmentForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
              <button className="btn btn-primary btn-full" onClick={saveAppointment} disabled={savingAppointment}>
                {savingAppointment ? t('save') + '...' : <><Plus size={16} /> {t('save')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHabitForm && (
        <div className="modal-overlay" onClick={() => setShowHabitForm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{t('add')} {t('habits')}</h3>
              <button onClick={() => setShowHabitForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('habit_title')}</label>
                <input className="input" placeholder="E.g., Drink water, Meditate" value={habitForm.title} onChange={(e) => setHabitForm((prev) => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="input-label" style={{ marginBottom: 6 }}>{t('time_of_day')}</label>
                <input className="input" placeholder="E.g., morning, afternoon" value={habitForm.timeOfDay} onChange={(e) => setHabitForm((prev) => ({ ...prev, timeOfDay: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-full" onClick={addHabit} disabled={savingHabit}>
                  {savingHabit ? t('save') + '...' : t('save')}
                </button>
                <button className="btn btn-ghost btn-full" onClick={generateHabits} disabled={generatingHabits}>
                  {generatingHabits ? t('generate_ai') + '...' : <><Sparkles size={16} /> {t('generate_ai')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
