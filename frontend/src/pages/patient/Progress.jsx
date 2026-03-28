'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

import api from '../../services/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function Progress() {
  const { t } = useTranslation();
  const [activeChart, setActiveChart] = useState('BLOOD_SUGAR');
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const CHARTS = {
    BLOOD_SUGAR: { key: 'BLOOD_SUGAR', name: t('blood_glucose'), unit: 'mg/dL', color: '#F59E0B', refLow: 70, refHigh: 180 },
    OXYGEN_SATURATION: { key: 'OXYGEN_SATURATION', name: t('spo2'), unit: '%', color: '#0EA5E9', refLow: 93, refHigh: 100 },
    BLOOD_PRESSURE: { key: 'BLOOD_PRESSURE', name: t('blood_pressure'), unit: 'mmHg', color: '#8B5CF6', refLow: 90, refHigh: 140 },
    HEART_RATE: { key: 'HEART_RATE', name: t('heart_rate'), unit: 'bpm', color: '#EF4444', refLow: 55, refHigh: 110 },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [vitalData] = await Promise.all([
          api.get('/vitals'),
        ]);
        setVitals(vitalData);
      } catch (err) {
        setError(err.message || 'Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartData = useMemo(() => vitals
    .filter((vital) => vital.type === activeChart)
    .slice()
    .reverse()
    .map((vital) => ({
      time: vital.measuredAt ? new Date(vital.measuredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
      primary: Number(vital.value || 0),
      secondary: Number(vital.secondaryValue || 0),
      critical: vital.criticalFlag,
    })), [vitals, activeChart]);

  const latestByType = useMemo(() => vitals.reduce((acc, vital) => {
    if (!acc[vital.type]) acc[vital.type] = vital;
    return acc;
  }, {}), [vitals]);

  const chart = CHARTS[activeChart];
  const latest = latestByType[activeChart];

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('progress')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('live_data')}</p>
      </div>

      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="tabs" style={{ marginBottom: 16 }}>
        {Object.values(CHARTS).map((item) => (
          <button key={item.key} className={`tab-item ${activeChart === item.key ? 'active' : ''}`} onClick={() => setActiveChart(item.key)}>
            {item.name}
          </button>
        ))}
      </div>

      <div className="chart-container" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <p className="chart-title" style={{ color: chart.color }}>{chart.name}</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: chart.color }}>{latest ? latest.value : '--'}</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{chart.unit}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div>{t('loading_chart')}</div>
        ) : chartData.length === 0 ? (
          <div>{t('no_readings')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={chart.refLow} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" />
              <ReferenceLine y={chart.refHigh} stroke="rgba(245,158,11,0.4)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="primary" stroke={chart.color} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: chart.color }} name={chart.name} />
              {activeChart === 'BLOOD_PRESSURE' && (
                <Line type="monotone" dataKey="secondary" stroke="#A78BFA" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#A78BFA' }} name="Diastolic" />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="section-header"><span className="section-title">{t('current_vitals')}</span></div>
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {Object.values(CHARTS).map((item) => {
          const vital = latestByType[item.key];
          return (
            <div key={item.key} className="stat-card">
              <div className="stat-value" style={{ color: item.color }}>
                {vital ? `${vital.value}${item.key === 'BLOOD_PRESSURE' && vital.secondaryValue ? `/${vital.secondaryValue}` : ''}` : '--'}
              </div>
              <div className="stat-unit">{item.unit}</div>
              <div className="stat-label">{item.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
