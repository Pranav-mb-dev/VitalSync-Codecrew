'use client';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAlerts } from '../../context/AlertContext';
import { AlertTriangle, Bell, Trash2, CheckCheck } from 'lucide-react';

export default function CaregiverAlerts() {
  const { t } = useTranslation();
  const { alerts, markRead, clearAll } = useAlerts();

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('alerts')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{alerts.filter(a => !a.read).length} {t('unread')}</p>
        </div>
        {alerts.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearAll} style={{ gap: 5, color: 'var(--danger)' }}>
            <Trash2 size={14} /> {t('clear')}
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Bell size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontWeight: 600 }}>{t('no_alerts')}</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>{t('caught_up')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(alert => (
            <div key={alert.id} className="card animate-in" style={{ opacity: alert.read ? 0.6 : 1, border: alert.read ? '1px solid var(--border)' : `1px solid ${alert.type === 'sos' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}` }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: alert.type === 'sos' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: alert.type === 'sos' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }}>
                  <AlertTriangle size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{alert.type === 'sos' ? t('sos_alert') : t('health_alert')}</p>
                    {!alert.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: alert.type === 'sos' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0, marginTop: 5 }} />}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{alert.message}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{alert.time}</p>
                </div>
              </div>
              {!alert.read && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, gap: 5, width: '100%' }} onClick={() => markRead(alert.id)}>
                  <CheckCheck size={14} /> {t('mark_as_read')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
