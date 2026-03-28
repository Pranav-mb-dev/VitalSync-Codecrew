'use client';
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Mail } from 'lucide-react';
import api from '../../services/api';

export default function FamilyCircles() {
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await api.get('/family/members');
        setMembers(data);
      } catch (err) {
        setError(err.message || 'Failed to load family links');
      }
    };

    fetchMembers();
  }, []);

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Family Circle</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{members.length} linked relationship(s)</p>
      </div>

      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 20, display: 'flex', gap: 12, padding: 14 }}>
        <div style={{ color: 'var(--success)' }}><ShieldCheck size={24} /></div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>Backend-linked care circle</p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>This list is coming from the family link table instead of a local array.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {members.length === 0 && (
          <div className="card">No linked members found.</div>
        )}
        {members.map((member) => (
          <div key={member.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18 }}>
              {(member.patientName || member.caregiverName || '?').slice(0, 1)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700 }}>{member.patientName || member.caregiverName || 'Linked Member'}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{member.status} · {member.patientEmail || member.caregiverEmail || 'No email'}</p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ padding: 4 }}><Mail size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
