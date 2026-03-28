'use client';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function DoctorPatients() {
  const { t } = useTranslation();

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('patients')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Doctor-specific patient listing is not wired yet.</p>
      </div>

      <div className="card">
        The backend currently exposes authenticated patient and caregiver resources, but it does not yet provide doctor patient-list or doctor patient-detail endpoints. This page intentionally shows no mock data.
      </div>
    </div>
  );
}
