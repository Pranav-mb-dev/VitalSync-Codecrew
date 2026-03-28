'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

export default function AIChat() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm your Vital Sync AI assistant. Ask me about your reports, medications, vitals, or anything health-related! 😊" }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async () => {
    if (!input.trim() || typing) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { from: 'user', text: userMsg }]);
    setTyping(true);
    
    try {
      const response = await api.post('/assistant/chat', { transcript: userMsg });
      const botReply = response.data.answer;
      setMessages(prev => [...prev, { from: 'bot', text: botReply }]);
    } catch (err) {
      console.error('AI Chat failed', err);
      setMessages(prev => [...prev, { from: 'bot', text: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') send(); };

  return (
    <>
      <button className="ai-chat-bubble" onClick={() => setOpen(true)} aria-label="Open AI Chat">
        <Sparkles size={22} />
      </button>

      {open && (
        <div className="ai-chat-backdrop" onClick={() => setOpen(false)}>
          <div className="ai-chat-window" onClick={e => e.stopPropagation()}>
            <div className="ai-chat-header">
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
                <Bot size={22} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{t('ai_chat')}</div>
                <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} /> Online
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'var(--bg-input)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, borderRadius: '50%', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            <div className="ai-chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`ai-msg ${msg.from === 'bot' ? 'ai-msg-bot' : 'ai-msg-user'}`}>
                  {msg.text}
                </div>
              ))}
              {typing && (
                <div className="ai-msg ai-msg-bot" style={{ padding: '8px 12px' }}>
                  <div className="thinking-pulse">
                    <span /> <span /> <span />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="ai-chat-input-row">
              <input
                className="input"
                placeholder={t('ask_ai')}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                style={{ fontSize: 14 }}
              />
              <button className="btn btn-primary btn-sm" onClick={send} disabled={!input.trim()}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
