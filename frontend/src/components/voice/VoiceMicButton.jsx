'use client';
import React from 'react';
import { Mic, StopCircle } from 'lucide-react';
import { useVoice } from '../../context/VoiceContext';

export default function VoiceMicButton() {
  const { isOpen, startListening, stopListening } = useVoice();

  return (
    <button
      className={`voice-mic-fab ${isOpen ? 'listening' : ''}`}
      onClick={isOpen ? stopListening : startListening}
      aria-label={isOpen ? 'Stop Voice Assistant' : 'Start Voice Assistant'}
      title={isOpen ? 'Stop Chat' : 'Talk to Vitya'}
    >
      {isOpen ? <StopCircle size={22} /> : <Mic size={22} />}
    </button>
  );
}
