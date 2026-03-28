'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Droplets, Heart, Wind, Thermometer, CheckCircle2, CalendarDays, Pill, Utensils } from 'lucide-react';
import HealthScoreRing from '../../components/HealthScoreRing';
import api from '../../services/api';

const getNoon = () => {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'night';
};

const matchesNoon = (timeOfDay = '', currentNoon) => {
  const value = timeOfDay.toLowerCase();
  if (!value) return true;
  if (currentNoon === 'morning') return value.includes('morning') || value.includes('am');
  if (currentNoon === 'afternoon') return value.includes('afternoon') || value.includes('noon') || value.includes('pm');
  return value.includes('night') || value.includes('evening');
};

export default function CaregiverDashboard() {
  const { t } = useTranslation();
  const [patient, setPatient] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [habits, setHabits] = useState([]);
  const [medications, setMedications] = useState([]);
  const [dietPlan, setDietPlan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentNoon = getNoon();

  const buildVitals = (latestByType) => [
    { label: t('blood_glucose'), value: latestByType.BLOOD_SUGAR?.value ?? '--', unit: 'mg/dL', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', icon: <Droplets size={12} /> },
    { label: t('spo2'), value: latestByType.OXYGEN_SATURATION?.value ?? '--', unit: '%', color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)', icon: <Wind size={12} /> },
    { label: t('heart_rate'), value: latestByType.HEART_RATE?.value ?? '--', unit: 'bpm', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: <Heart size={12} /> },
    {
      label: t('blood_pressure'),
      value: latestByType.BLOOD_PRESSURE ? `${latestByType.BLOOD_PRESSURE.value}/${latestByType.BLOOD_PRESSURE.secondaryValue ?? '--'}` : '--',
      unit: 'mmHg',
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.1)',
      icon: <Thermometer size={12} />,
    },
  ];

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [profileData, vitalData, appointmentData, habitData, medData, dietData] = await Promise.all([
          api.get('/profile/patient'),
          api.get('/vitals'),
          api.get('/appointments'),
          api.get('/habits'),
          api.get('/medications'),
          api.get('/diet'),
        ]);
        if (mounted) {
          setPatient(profileData);
          setVitals(vitalData);
          setAppointments(appointmentData);
          setHabits(habitData);
          setMedications(medData || []);
          setDietPlan(Array.isArray(dietData) ? dietData : []);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load caregiver dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  const latestByType = useMemo(() => vitals.reduce((acc, vital) => {
    if (!acc[vital.type]) acc[vital.type] = vital;
    return acc;
  }, {}), [vitals]);

  const vitalCards = useMemo(() => buildVitals(latestByType), [latestByType, t]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return [...appointments]
      .filter((a) => new Date(a.appointmentDateTime) >= now)
      .sort((a, b) => new Date(a.appointmentDateTime) - new Date(b.appointmentDateTime))
      .slice(0, 3);
  }, [appointments]);

  const currentNoonHabits = useMemo(
    () => habits.filter((h) => matchesNoon(h.timeOfDay, currentNoon)).slice(0, 4),
    [habits, currentNoon]
  );

  const currentNoonMeds = useMemo(() => {
    return medications.filter(m =>
      (matchesNoon(m.frequency, currentNoon) || matchesNoon(m.instructions, currentNoon))
    ).slice(0, 4);
  }, [medications, currentNoon]);

  const currentNoonDiets = useMemo(() => {
    if (!dietPlan || !Array.isArray(dietPlan)) return [];
    return dietPlan.filter(d => {
      const freqs = d.frequency ? d.frequency.toLowerCase() : '';
      return freqs.includes(currentNoon.toLowerCase());
    });
  }, [dietPlan, currentNoon]);

  const wellnessScore = useMemo(() => {
    let score = 100;
    habits.filter((h) => !h.completed).forEach(() => { score -= 5; });
    vitals.filter((vital) => vital.criticalFlag).forEach(() => { score -= 18; });
    return Math.max(0, Math.min(100, score));
  }, [habits, vitals]);

  const noonLabel = t(currentNoon);

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('caring_for')}</p>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{patient?.fullName || t('linked_patient')}</h1>
      </div>

      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Health Score + Vitals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.25fr)', gap: 8, marginBottom: 20 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-card)', minHeight: 130, padding: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>{t('health_score')}</p>
          <HealthScoreRing score={wellnessScore} size={72} />
          <p style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: 'var(--primary)' }}>
            {wellnessScore >= 75 ? t('health_score_stable') : wellnessScore >= 50 ? t('health_score_attention') : t('health_score_critical')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {vitalCards.map((vital) => (
            <div key={vital.label} className="stat-card" style={{ padding: '10px 10px', minHeight: 70 }}>
              <div className="stat-icon" style={{ background: vital.bg, color: vital.color, borderRadius: 6, width: 22, height: 22, marginBottom: 4 }}>{vital.icon}</div>
              <div>
                <div className="stat-value" style={{ color: vital.color, fontSize: 16 }}>{vital.value}</div>
                <div className="stat-unit" style={{ fontSize: 10 }}>{vital.unit}</div>
                <div className="stat-label" style={{ marginTop: 2, fontSize: 10 }}>{vital.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Noon Medications */}
      {currentNoonMeds.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-title"><Pill size={14} /> {noonLabel} {t('medications')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {currentNoonMeds.map((med) => {
              const isLogged = med.takenSessionsToday?.includes(currentNoon) || false;
              return (
                <div key={med.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', opacity: isLogged ? 0.65 : 1 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: isLogged ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isLogged ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}>
                    <Pill size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{med.name} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{med.dosage}</span></p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{med.instructions || t('after_food')}</p>
                  </div>
                  {isLogged ? (
                    <span className="pill pill-success" style={{ opacity: 0.8 }}>{t('taken')}</span>
                  ) : (
                    <span className="pill pill-warning">{t('pending')}</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Current Noon Diet */}
      <div className="section-header">
        <span className="section-title"><Utensils size={14} /> {t('patient_diet')} — {noonLabel}</span>
      </div>
      <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div className="card" style={{ animation: 'pulse 2s infinite' }}>{t('loading_meal')}</div>
        ) : currentNoonDiets.length === 0 ? (
          <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('no_diet')}</div>
        ) : (
          currentNoonDiets.map((diet) => {
            const isLogged = diet.takenSessionsToday?.includes(currentNoon) || false;
            return (
              <div key={diet.id} className="card" style={{ background: 'var(--gradient-card)', border: '1px solid var(--border)', opacity: isLogged ? 0.75 : 1 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: isLogged ? 'rgba(16,185,129,0.12)' : 'var(--primary)', color: isLogged ? '#10b981' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Utensils size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, textDecoration: isLogged ? 'line-through' : 'none' }}>{diet.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{diet.description}</p>
                  </div>
                </div>
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}>
                  {isLogged ? (
                    <span className="pill pill-success" style={{ opacity: 0.8 }}><CheckCircle2 size={12} style={{ marginRight: 4 }} /> {t('logged')}</span>
                  ) : (
                    <span className="pill pill-warning">{t('not_logged')}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Current Noon Habits */}
      <div className="section-header">
        <span className="section-title"><Bell size={14} /> {noonLabel} {t('habits')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {loading ? (
          <div className="card">{t('loading')}</div>
        ) : currentNoonHabits.length === 0 ? (
          <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('no_habits')}</div>
        ) : (
          currentNoonHabits.map((habit) => (
            <div key={habit.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', opacity: habit.completed ? 0.65 : 1 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, textDecoration: habit.completed ? 'line-through' : 'none' }}>{habit.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{habit.timeOfDay || noonLabel}</p>
              </div>
              {habit.completed ? (
                <span className="pill pill-success" style={{ opacity: 0.8 }}><CheckCircle2 size={12} style={{ marginRight: 4 }} /> {t('done')}</span>
              ) : (
                <span className="pill pill-warning">{t('pending')}</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className="section-header">
        <span className="section-title"><CalendarDays size={14} /> {t('upcoming_appointments')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {loading ? (
          <div className="card">{t('loading')}</div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="card" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('no_appointments')}</div>
        ) : (
          upcomingAppointments.map((apt) => (
            <div key={apt.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                <CalendarDays size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{apt.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(apt.appointmentDateTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}
                  {new Date(apt.appointmentDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {apt.doctorName && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{apt.doctorName}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
