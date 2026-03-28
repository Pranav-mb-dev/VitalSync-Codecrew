'use client';
import React from 'react';
import { Mic } from 'lucide-react';
import { useVoice } from '../../context/VoiceContext';

export default function VoiceHint({ command = "Log my medicine" }) {
  const { startListening } = useVoice();

  return (
    <div className="voice-hint-chip" onClick={startListening}>
      <Mic size={14} />
      <span>Say "{command}"</span>
    </div>
  );
}
