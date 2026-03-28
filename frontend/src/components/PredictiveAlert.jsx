'use client';
import React from 'react';
import { AlertTriangle, TrendingDown, Info, X } from 'lucide-react';

export default function PredictiveAlert({ type = 'warning', title, desc, onDismiss }) {
  return (
    <div className="predictive-banner">
      <div className="icon-box" style={{ background: type === 'warning' ? '#F59E0B' : '#EF4444' }}>
        {type === 'warning' ? <AlertTriangle size={18} /> : <TrendingDown size={18} />}
      </div>
      <div style={{ flex: 1 }}>
        <div className="predictive-title">{title}</div>
        <div className="predictive-desc">{desc}</div>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
        <X size={16} />
      </button>
    </div>
  );
}
