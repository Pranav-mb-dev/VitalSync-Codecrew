'use client';
import React, { useState } from 'react';
import { CheckCircle2, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

export default function SOS() {
  const { t } = useTranslation();
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  const triggerSOS = async () => {
    if (state === 'idle') {
      setState('confirm');
      return;
    }

    if (state === 'confirm') {
      setError('');
      try {
        const coords = await new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve({ latitude: null, longitude: null });
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
            () => resolve({ latitude: null, longitude: null }),
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });

        await api.post('/sos/trigger', {
          reason: 'Manual SOS',
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setState('sent');
        setTimeout(() => setState('idle'), 5000);
      } catch (err) {
        setError(err.message || 'Failed to send SOS');
        setState('idle');
      }
    }
  };

  return (
    <div className="animate-fade">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>{t('sos_critical_title')}</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 30 }}>{t('sos_critical_desc')}</p>
      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="sos-screen">
        {state === 'sent' ? (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '3px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={56} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>{t('sos_sent')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{t('sos_desc')}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{t('sos_stay_calm')}</p>
          </div>
        ) : (
          <>
            <button className="sos-btn-main" onClick={triggerSOS}>
              <span style={{ fontSize: 44, fontWeight: 900 }}>{t('sos')}</span>
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{t('sos_emergency')}</span>
            </button>

            {state === 'confirm' && (
              <div className="alert-banner alert-danger" style={{ maxWidth: 300, textAlign: 'center', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontWeight: 700 }}>{t('sos_confirm')}</p>
                <p style={{ fontSize: 13 }}>{t('sos_desc')}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={triggerSOS}>{t('sos')}</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setState('idle')}>{t('cancel')}</button>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ width: '100%', maxWidth: 320 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{t('sos_emergency_action')}</p>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ fontSize: 24 }}>{t('sos')}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700 }}>{t('sos_notify_caregiver')}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('sos_backend_desc')}</p>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <Phone size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
