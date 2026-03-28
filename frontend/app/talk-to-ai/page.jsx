'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Volume2, Sparkles, User, Bot, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVoice } from '../../src/context/VoiceContext';

export default function TalkToAIPage() {
  const router = useRouter();
  const { startListening, isListening, status, transcription, lastResponse } = useVoice();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm your Vital Sync AI. How can I help you today?", time: '10:00 AM' }
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (status === 'Speaking' && lastResponse) {
      setMessages(prev => [...prev, { role: 'assistant', text: lastResponse, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }
  }, [status, lastResponse]);

  const handleSend = (text) => {
    const val = text || input;
    if (!val.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: val, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInput('');
    
    // Mock Assistant Reply
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm analyzing that for you. Based on your recent vitals, everything looks stable.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1000);
  };

  return (
    <div className="app-shell" style={{ height: '100vh', background: 'var(--bg-base)' }}>
      <header className="app-header">
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <ArrowLeft size={24} />
        </button>
        <div className="header-logo"><Sparkles size={18} color="var(--primary)" /> Talk to AI</div>
        <div style={{ width: 24 }} />
      </header>

      <main className="ai-chat-messages" style={{ padding: '20px 16px', paddingBottom: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, opacity: 0.7, fontSize: 11 }}>
              {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
              <span>{m.role === 'user' ? 'You' : 'Assistant'} · {m.time}</span>
            </div>
            {m.text}
            {m.role === 'assistant' && (
              <button className="tts-btn">
                <Volume2 size={12} /> Play
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="ai-chat-input-row" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', padding: '16px', paddingBottom: 'calc(16px + var(--safe-bottom))', display: 'flex', gap: 10, alignItems: 'center', zIndex: 100 }}>
        <button 
          className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`} 
          style={{ width: 44, height: 44, borderRadius: '50%', padding: 0 }}
          onClick={startListening}
        >
          <Mic size={20} />
        </button>
        <input 
          className="input" 
          placeholder="Type your question..." 
          value={input} 
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, height: 44, borderRadius: 22 }}
        />
        <button 
          className="btn btn-primary" 
          style={{ width: 44, height: 44, borderRadius: '50%', padding: 0 }}
          onClick={() => handleSend()}
          disabled={!input.trim()}
        >
          <Send size={20} />
        </button>
      </footer>
    </div>
  );
}
