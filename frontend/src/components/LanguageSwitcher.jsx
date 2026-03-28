'use client';
import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ta', label: 'த', name: 'தமிழ்' },
  { code: 'hi', label: 'हि', name: 'हिंदी' },
  { code: 'kn', label: 'ಕ', name: 'ಕನ್ನಡ' },
  { code: 'te', label: 'తె', name: 'తెలుగు' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANGS.find(l => l.code === i18n.language) || LANGS[0];

  const select = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('vs-lang', code);
    // Sync to vs-user so VoiceNavigator picks up the correct mic language
    try {
      const stored = localStorage.getItem('vs-user');
      if (stored) {
        const u = JSON.parse(stored);
        u.language = code;
        localStorage.setItem('vs-user', JSON.stringify(u));
      }
    } catch {}
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary)', transition: 'var(--transition)' }}
        aria-label="Language"
      >
        <Globe size={18} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 300 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', right: 0, top: 44, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', zIndex: 400, minWidth: 150, boxShadow: 'var(--shadow-lg)' }}>
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                style={{
                  width: '100%', padding: '11px 16px', background: lang.code === i18n.language ? 'rgba(14,165,233,0.1)' : 'none',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  color: lang.code === i18n.language ? 'var(--primary)' : 'var(--text-primary)',
                  fontSize: 14, fontWeight: lang.code === i18n.language ? 700 : 500, fontFamily: 'Inter',
                  transition: 'var(--transition)',
                }}
              >
                <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{lang.label}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
