'use client';
import React, { useEffect, useRef } from 'react';
import { X, Mic, Brain, Volume2, Sparkles, MessageCircle } from 'lucide-react';
import { useVoice } from '../../context/VoiceContext';

export default function VoiceOverlay() {
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
          <div className="voice-overlay-avatar">
            {isListening  && <Mic size={20} />}
            {isProcessing && <Brain size={20} />}
            {isSpeaking   && <Sparkles size={20} />}
            {status === 'Idle' && <MessageCircle size={20} />}
          </div>
          <div style={{ flex: 1 }}>
            <p className="voice-overlay-title">
              {isListening  && 'Listening…'}
              {isProcessing && 'Thinking…'}
              {isSpeaking   && 'Speaking…'}
              {status === 'Idle' && 'Vital Assistant'}
            </p>
            <p className="voice-overlay-lang">🌐 {language}</p>
          </div>
          <button className="voice-overlay-close" onClick={stopListening} aria-label="End conversation">
            <X size={16} />
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
            <div className="voice-wave-row">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className={`voice-wave-bar ${isProcessing ? 'processing' : ''}`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                />
              ))}
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
