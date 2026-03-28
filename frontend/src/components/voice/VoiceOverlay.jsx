'use client';
import React, { useEffect, useRef } from 'react';
import { X, Mic, Brain, Volume2, Sparkles, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVoice } from '../../context/VoiceContext';

export default function VoiceOverlay() {
  const { t } = useTranslation();
  const {
    isListening, isProcessing, isSpeaking, isOpen,
    status, transcription, lastResponse, conversation,
    language, stopListening,
  } = useVoice();

  const chatEndRef = useRef(null);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, transcription]);

  if (!isOpen) return null;

  return (
    <div className="voice-overlay-backdrop" onClick={stopListening}>
      <div className="voice-overlay-card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="voice-overlay-header">
          <div className={`voice-overlay-avatar ${isSpeaking ? 'active-speaking' : ''}`}>
            {isListening  && <Mic size={24} />}
            {isProcessing && <Brain size={24} />}
            {isSpeaking   && <Sparkles size={24} />}
            {status === 'Idle' && <MessageCircle size={24} />}
          </div>
          <div style={{ flex: 1 }}>
            <p className="voice-overlay-title">
              {isListening  ? t('listening') : isProcessing ? t('thinking') : isSpeaking ? t('speaking') : t('assistant')}
            </p>
            <p className="voice-overlay-lang">🌐 {language}</p>
          </div>
          <button className="voice-overlay-close" onClick={stopListening} aria-label="End conversation">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* Conversation history */}
          {conversation.length > 0 && (
            <div className="voice-convo-scroll">
              {conversation.map((msg, i) => (
                <div
                  key={i}
                  className={`voice-convo-bubble ${msg.role === 'user' ? 'voice-bubble-user' : 'voice-bubble-ai'}`}
                >
                  {msg.role === 'assistant' && (
                    <Volume2 size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                  )}
                  <span>{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Waveform while listening / processing */}
          {(isListening || isProcessing) && (
            <div className={`voice-wave-row ${isProcessing ? 'ai-wave-active' : ''}`} style={{ 
              borderRadius: isProcessing ? 'var(--radius-lg)' : '0',
              padding: isProcessing ? '12px' : '0',
              margin: isProcessing ? '16px' : '0'
            }}>
              {isProcessing ? (
                <div className="thinking-pulse" style={{ width: '100%', justifyContent: 'center' }}>
                  <span /> <span /> <span />
                </div>
              ) : (
                [...Array(16)].map((_, i) => (
                  <div
                    key={i}
                    className="voice-wave-bar"
                    style={{ animationDelay: `${i * 0.07}s` }}
                  />
                ))
              )}
            </div>
          )}

          {/* Live transcription */}
          {isListening && (
            <div className="voice-transcript">
              {transcription || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Speak now…</span>}
            </div>
          )}

          {/* Speaking indicator */}
          {isSpeaking && lastResponse && (
            <div className="voice-response">
              <Volume2 size={14} style={{ flexShrink: 0, marginTop: 3, color: 'var(--primary)' }} />
              <p style={{ flex: 1 }}>{lastResponse}</p>
            </div>
          )}
        </div>

        {/* Bottom row — always visible, never pushed off screen */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {isListening  ? '🔴 Listening…'
            : isProcessing ? '⏳ Thinking…'
            : isSpeaking   ? '🔊 Speaking…'
            : '✅ Done'}
          </span>
          <button className="btn btn-danger btn-sm" onClick={stopListening}>
            <X size={14} /> End Chat
          </button>
        </div>
      </div>
    </div>
  );
}
