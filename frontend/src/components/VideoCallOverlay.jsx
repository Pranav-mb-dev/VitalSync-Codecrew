'use client';
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, User, MoreHorizontal, Maximize2 } from 'lucide-react';

export default function VideoCallOverlay({ doctorName, onEnd }) {
  const [mic, setMic] = useState(true);
  const [video, setVideo] = useState(true);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="video-call-overlay">
      <div className="video-remote">
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <User size={48} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>{doctorName}</h2>
          <p style={{ color: 'var(--primary)', fontWeight: 600, marginTop: 8 }}>{formatTime(timer)}</p>
        </div>

        <div className="video-local">
          <div style={{ width: '100%', height: '100%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {video ? <User size={32} style={{ opacity: 0.5 }} /> : <VideoOff size={32} color="#EF4444" />}
          </div>
        </div>

        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <button className="control-btn"><Maximize2 size={20} /></button>
        </div>
      </div>

      <div className="video-controls">
        <button className={`control-btn ${!mic ? 'btn-danger' : ''}`} onClick={() => setMic(!mic)}>
          {mic ? <Mic size={22} /> : <MicOff size={22} />}
        </button>
        <button className={`control-btn-end control-btn`} onClick={onEnd}>
          <PhoneOff size={24} />
        </button>
        <button className={`control-btn ${!video ? 'btn-danger' : ''}`} onClick={() => setVideo(!video)}>
          {video ? <Video size={22} /> : <VideoOff size={22} />}
        </button>
        <button className="control-btn"><MoreHorizontal size={22} /></button>
      </div>
    </div>
  );
}
