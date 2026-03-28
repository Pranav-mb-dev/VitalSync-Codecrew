'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AI_RESPONSES = [
  "Based on your recent reports, your HbA1c levels are within the controlled range. Keep maintaining your diet and medication schedule. 🌟",
  "Your blood glucose trend shows improvement over the past week. The morning readings are stabilizing nicely.",
  "I notice your SpO2 levels have been excellent! Regular walks are clearly helping your lung capacity.",
  "Your current medication Metformin 500mg is typically taken twice daily with meals. Always consult Dr. Neha for any changes.",
  "Looking at your biomarkers: Hemoglobin 13.2 g/dL is slightly low. Consider iron-rich foods like spinach and lentils.",
  "Great job logging all your meals today! Your caloric intake aligns well with your diabetes management plan.",
  "Your health score has improved by 8 points this week. Keep up the excellent work! 💪",
  "Based on your report, your kidney function (Creatinine: 1.1) is within normal limits. Stay well hydrated.",
];

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
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { from: 'user', text: userMsg }]);
    setTyping(true);
    await new Promise(r => setTimeout(r, 1200));
    const botReply = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
    setTyping(false);
    setMessages(prev => [...prev, { from: 'bot', text: botReply }]);
  };

  const handleKey = (e) => { if (e.key === 'Enter') send(); };

  return (
    <>
      <button className="ai-chat-bubble" onClick={() => setOpen(true)} aria-label="Open AI Chat">
        <Sparkles size={22} />
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setOpen(false)}>
          <div className="ai-chat-window" onClick={e => e.stopPropagation()}>
            <div className="ai-chat-header">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#8B5CF6,#0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t('ai_chat')}</div>
                <div style={{ fontSize: 11, color: 'var(--success)' }}>● Online</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
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
                <div className="ai-msg ai-msg-bot" style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '12px 16px' }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', animation: `pulse 1s ${i*0.2}s ease-in-out infinite` }} />
                  ))}
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
