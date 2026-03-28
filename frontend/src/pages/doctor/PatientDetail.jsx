'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function PatientDetail() {
  const router = useRouter();

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.push('/doctor/patients')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>Doctor View Unavailable</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No backend endpoint is available for doctor patient detail yet.</p>
        </div>
      </div>

      <div className="card">
        This route has been cleared of hardcoded patient data. Implement doctor-facing APIs in the backend before restoring this screen.
      </div>
    </div>
  );
}
