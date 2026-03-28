'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, Sparkles, Plus, Download, X } from 'lucide-react';

import api from '../../services/api';

const STATUS_COLOR = { ok: '#22C55E', warning: '#F59E0B', critical: '#EF4444' };
const STATUS_BG = { ok: 'rgba(34,197,94,0.1)', warning: 'rgba(245,158,11,0.1)', critical: 'rgba(239,68,68,0.1)' };

const parseMetrics = (value) => {
  try {
    const parsed = JSON.parse(value || '{}');
    return Object.entries(parsed).map(([name, metricValue]) => ({ name, value: String(metricValue) }));
  } catch {
    return [];
  }
};

export default function Reports() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/reports');
      setReports(data);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const reportCards = useMemo(() => reports.map((report) => ({
    ...report,
    metrics: parseMetrics(report.extractedMetrics),
  })), [reports]);

  const uploadReport = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', selectedFile);
      const created = await api.upload('/reports/upload', formData);
      setReports((prev) => [created, ...prev]);
      setSelectedFile(null);
      setShowUpload(false);
    } catch (err) {
      setError(err.message || 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{t('reports')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{reports.length} {t('reports').toLowerCase()}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)} style={{ gap: 5 }}>
          <Plus size={14} /> {t('add_report')}
        </button>
      </div>

      {error && <div className="alert-banner alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="card">{t('loading_reports')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reportCards.length === 0 && (
            <div className="card" style={{ textAlign: 'center' }}>
              {t('no_reports')}
            </div>
          )}

          {reportCards.map((report) => {
            const state = report.criticalFlagged ? 'critical' : report.metrics.length > 0 ? 'ok' : 'warning';
            return (
              <div key={report.id} className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('health_report')}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {report.geminiSummary || report.rawExtractedText || t('no_analysis')}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <span className="pill pill-primary" style={{ fontSize: 11 }}>
                        {report.uploadedAt ? new Date(report.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : t('unknown_date')}
                      </span>
                      {report.metrics.length > 0 && (
                        <span className="pill" style={{ fontSize: 11, background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                          {report.metrics.length} {t('biomarkers')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedReport(report)} className="btn btn-outline btn-sm" style={{ padding: '6px 16px', fontWeight: 600 }}>
                    {t('view')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedReport && (() => {
        const state = selectedReport.criticalFlagged ? 'critical' : selectedReport.metrics.length > 0 ? 'ok' : 'warning';
        return (
          <div className="modal-overlay" onClick={() => setSelectedReport(null)} style={{ zIndex: 1000, padding: 20 }}>
            <div className="modal-sheet animate-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 24, borderRadius: 20, top: 'auto', bottom: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{t('health_report')}</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
                    {selectedReport.uploadedAt ? new Date(selectedReport.uploadedAt).toLocaleString() : t('unknown_date')}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={async (e) => {
                    e.currentTarget.disabled = true;
                    e.currentTarget.innerText = t('generating');
                    const html2pdf = (await import('html2pdf.js')).default;
                    const element = document.getElementById(`report-print-${selectedReport.id}`);
                    html2pdf().from(element).set({
                      margin: 10,
                      filename: `HealthReport-${new Date(selectedReport.uploadedAt || Date.now()).toISOString().slice(0,10)}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2, useCORS: true },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    }).save().then(() => {
                      e.target.disabled = false;
                      e.target.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> ${t('download_pdf')}`;
                      e.target.style.gap = '6px';
                      e.target.style.display = 'flex';
                    });
                  }} style={{ gap: 6, display: 'flex', alignItems: 'center' }}>
                    <Download size={16} /> {t('download_pdf')}
                  </button>
                  <button onClick={() => setSelectedReport(null)} style={{ background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--text-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div id={`report-print-${selectedReport.id}`} style={{ padding: '0 8px' }}>
                {selectedReport.fileUrl && (
                  <div style={{ marginBottom: 28 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{t('report_document')}</p>
                    {selectedReport.fileType?.includes('pdf') || selectedReport.fileUrl.endsWith('.pdf') ? (
                      <a href={selectedReport.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, border: '1px solid var(--border)', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, background: '#f8fafc' }}>
                        <FileText size={24} /> {t('view_original_pdf')}
                      </a>
                    ) : (
                      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: '#f8fafc', padding: 16 }}>
                        <img src={selectedReport.fileUrl} alt={t('health_report')} crossOrigin="anonymous" style={{ width: '100%', maxHeight: 600, objectFit: 'contain', display: 'block', borderRadius: 8 }} />
                      </div>
                    )}
                  </div>
                )}

                <div style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(14,165,233,0.08))', borderRadius: 16, padding: 24, marginBottom: 28, border: '1px solid rgba(139,92,246,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Sparkles size={20} color="var(--accent)" />
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.05em' }}>{t('ai_analysis')}</span>
                  </div>
                  <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {selectedReport.geminiSummary || selectedReport.hfAnalysis || selectedReport.rawExtractedText || t('no_analysis')}
                  </p>
                </div>

                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{t('extracted_biomarkers')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                  {selectedReport.metrics.length === 0 && (
                    <div className="card" style={{ background: STATUS_BG[state], gridColumn: '1 / -1' }}>
                      {t('no_biomarkers')}
                    </div>
                  )}
                  {selectedReport.metrics.map((metric) => (
                    <div key={metric.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: STATUS_BG[state], borderRadius: 12, border: `1px solid ${STATUS_COLOR[state]}33` }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{metric.name}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: STATUS_COLOR[state] }}>{metric.value}</p>
                        {state !== 'ok' && <span style={{ fontSize: 11, fontWeight: 800, color: STATUS_COLOR[state], textTransform: 'uppercase' }}>{state}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{t('add_report')}</h3>
            <label style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, display: 'block' }}>
              <Upload size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600 }}>{selectedFile ? selectedFile.name : t('upload_report')}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PDF, JPG, PNG · Max 10MB</p>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            </label>
            <button className="btn btn-primary btn-full" onClick={uploadReport} disabled={!selectedFile || uploading}>
              {uploading ? t('uploading') : t('upload_analyze')}
            </button>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setShowUpload(false)}>{t('cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
