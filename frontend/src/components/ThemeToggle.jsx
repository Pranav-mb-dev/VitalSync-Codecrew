'use client';
import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-full)',
          width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',        
          cursor: 'pointer',
          color: '#FCD34D',
          transition: 'var(--transition)',
          flexShrink: 0,
        }}
        aria-label="Toggle theme"
      >
        <Sun size={18} />
      </button>
    );
  }

return (
    <button
      onClick={toggle}
      style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-full)',
        width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: theme === 'dark' ? '#FCD34D' : '#F59E0B',
        transition: 'var(--transition)',
        flexShrink: 0,
      }}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
