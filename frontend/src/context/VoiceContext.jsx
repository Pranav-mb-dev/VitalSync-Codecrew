'use client';
import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';

const VoiceContext = createContext();

// ── Language map ─────────────────────────────────────────────────────────────
// Neural2 = Google's best quality; WaveNet = fallback where Neural2 unavailable
const LANG_MAP = {
  en: { code: 'en-IN', name: 'English',   gcpCode: 'en-IN', gcpVoice: 'en-IN-Neural2-D' },  // Indian English accent
  hi: { code: 'hi-IN', name: 'Hindi',     gcpCode: 'hi-IN', gcpVoice: 'hi-IN-Neural2-D' },  // Natural Hindi
  ta: { code: 'ta-IN', name: 'Tamil',     gcpCode: 'ta-IN', gcpVoice: 'ta-IN-Wavenet-D' },  // Best Tamil available
  te: { code: 'te-IN', name: 'Telugu',    gcpCode: 'te-IN', gcpVoice: 'te-IN-Wavenet-D' },
  ml: { code: 'ml-IN', name: 'Malayalam', gcpCode: 'ml-IN', gcpVoice: 'ml-IN-Wavenet-D' },
  kn: { code: 'kn-IN', name: 'Kannada',  gcpCode: 'kn-IN', gcpVoice: 'kn-IN-Wavenet-D' },
  mr: { code: 'mr-IN', name: 'Marathi',  gcpCode: 'mr-IN', gcpVoice: 'mr-IN-Wavenet-C' },
  bn: { code: 'bn-IN', name: 'Bengali',  gcpCode: 'bn-IN', gcpVoice: 'bn-IN-Wavenet-D' },
  gu: { code: 'gu-IN', name: 'Gujarati', gcpCode: 'gu-IN', gcpVoice: 'gu-IN-Wavenet-C' },
  pa: { code: 'pa-IN', name: 'Punjabi',  gcpCode: 'pa-IN', gcpVoice: 'pa-IN-Wavenet-D' },
};

const getLangConfig = (key) => {
  const k = (key || 'en').replace(/-.*/, '').toLowerCase();
  return LANG_MAP[k] || LANG_MAP['en'];
};

// ── Global audio ref + cancel token ─────────────────────────────────────────
let currentAudio = null;
let cancelToken = 0;  // Incremented on every stop — invalidates in-flight speakText calls

function stopAllAudio() {
  cancelToken++;  // Invalidate any in-flight speakText / fallbackSpeak calls
  if (currentAudio) { currentAudio.pause(); currentAudio.src = ''; currentAudio = null; }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// ── Speak via backend GCP TTS → browser fallback ─────────────────────────────
async function speakText(text, langConfig, onEnd) {
  if (!text) { onEnd && onEnd(); return; }
  stopAllAudio();                    // increments cancelToken
  const myToken = cancelToken;      // capture — if it changes, we've been cancelled

  try {
    const result = await api.post('/tts/synthesize', {
      text,
      languageCode: langConfig.gcpCode,
      voiceName: langConfig.gcpVoice,
    });

    // User pressed "End Chat" while the TTS API was in-flight → abort silently
    if (cancelToken !== myToken) return;

    const audioContent = result?.audioContent;
    if (!audioContent) throw new Error('No audio content');

    const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
    currentAudio = audio;

    // ── Guard: ensure fallback is called AT MOST ONCE ──
    // audio.onerror AND audio.play().catch() can both fire when playback
    // fails, which previously triggered two simultaneous TTS voices.
    let fallbackCalled = false;
    const safeFallback = () => {
      if (fallbackCalled) return;
      fallbackCalled = true;
      currentAudio = null;
      // Only fallback if we haven't been cancelled since this speakText started
      if (cancelToken === myToken) fallbackSpeak(text, langConfig, onEnd, myToken);
    };

    audio.onended = () => { currentAudio = null; if (cancelToken === myToken) onEnd && onEnd(); };
    audio.onerror = () => safeFallback();
    audio.play().catch(() => safeFallback());
  } catch {
    // Only fallback if we haven't been cancelled
    if (cancelToken === myToken) fallbackSpeak(text, langConfig, onEnd, myToken);
  }
}

function fallbackSpeak(text, langConfig, onEnd, token) {
  // If no token passed (legacy call) or token still matches, proceed
  if (token !== undefined && cancelToken !== token) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) { onEnd && onEnd(); return; }
  // Cancel any lingering browser TTS before starting a new one
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang  = langConfig.code;
  u.rate  = 0.92;
  u.pitch = 1.05;
  u.onend  = () => { if (token === undefined || cancelToken === token) onEnd && onEnd(); };
  u.onerror = () => { if (token === undefined || cancelToken === token) onEnd && onEnd(); };
  window.speechSynthesis.speak(u);
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const VoiceProvider = ({ children, userLanguage }) => {
  const router = useRouter();

  const recognitionRef  = useRef(null);
  const transcriptRef   = useRef('');
  const continuousRef   = useRef(false);  // Whether we're in continuous chat mode
  const stoppingRef     = useRef(false);  // Guard against restart after intentional stop

  const [isListening,  setIsListening]  = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [isOpen,       setIsOpen]       = useState(false);  // Controls overlay visibility
  const [status,       setStatus]       = useState('Idle');
  const [transcription, setTranscription] = useState('');
  const [lastResponse,  setLastResponse]  = useState(null);
  const [conversation,  setConversation]  = useState([]);
  // ── Language init ─────────────────────────────────────────────────────────
  // Read localStorage SYNCHRONOUSLY so the correct language is set on the very
  // first render — before AuthContext's useEffect has a chance to load the user.
  // This avoids the race where userLanguage === 'en' on mount because auth is async.
  const [langConfig, setLangConfig] = useState(() => {
    // 1. Prefer the prop if already available (e.g. server-side or fast renders)
    if (userLanguage && userLanguage !== 'en') return getLangConfig(userLanguage);
    // 2. Fall back to localStorage (same key AuthContext uses)
    try {
      const stored = localStorage.getItem('vs-user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.language) return getLangConfig(u.language);
      }
    } catch {}
    // 3. Use the prop (may be 'en') or hard default
    return getLangConfig(userLanguage || 'en');
  });

  // Keep voice language in sync if the prop changes (e.g. user updates profile language live)
  useEffect(() => {
    if (userLanguage) setLangConfig(getLangConfig(userLanguage));
  }, [userLanguage]);

  // ── Core: speak then auto-restart listening if in continuous mode ──────────
  const speakAndContinue = useCallback((text, langCfg) => {
    setStatus('Speaking');
    setIsSpeaking(true);
    setLastResponse(text);
    setConversation(prev => [...prev, { role: 'assistant', text }]);

    speakText(text, langCfg, () => {
      setIsSpeaking(false);

      if (continuousRef.current && !stoppingRef.current) {
        // Auto-restart listening after a short pause
        setTimeout(() => {
          if (continuousRef.current && !stoppingRef.current) {
            startListeningInternal(langCfg, true);
          }
        }, 600);
      } else {
        setStatus('Idle');
        setLastResponse(null);
      }
    });
  }, []);

  // ── Start listening ───────────────────────────────────────────────────────
  const startListeningInternal = useCallback((langCfg) => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const msg = 'Voice input is not supported. Please use Chrome or Edge.';
      speakAndContinue(msg, langCfg);
      return;
    }

    stoppingRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.lang = langCfg.code;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      transcriptRef.current = '';
      setTranscription('');
      setIsListening(true);
      setStatus('Listening');
    };

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map(r => r[0]?.transcript || '')
        .join(' ').trim();
      transcriptRef.current = text;
      setTranscription(text);
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'no-speech' && continuousRef.current && !stoppingRef.current) {
        // Silently restart; user just didn't say anything
        setTimeout(() => {
          if (continuousRef.current && !stoppingRef.current) {
            startListeningInternal(langCfg, true);
          }
        }, 400);
      } else {
        setStatus('Idle');
      }
    };

    recognition.onend = async () => {
      setIsListening(false);
      const finalTranscript = transcriptRef.current.trim();

      if (!finalTranscript) {
        // Nothing said — restart if continuous
        if (continuousRef.current && !stoppingRef.current) {
          setTimeout(() => startListeningInternal(langCfg, true), 400);
        } else {
          setStatus('Idle');
        }
        return;
      }

      // If user stopped BEFORE we even start processing, bail out cleanly
      if (stoppingRef.current) { setStatus('Idle'); return; }

      // Add user turn to conversation
      setConversation(prev => [...prev, { role: 'user', text: finalTranscript }]);
      setIsProcessing(true);
      setStatus('Processing');

      // Intercept navigation intents purely on frontend using Gemini
      let navTarget = null;
      let navMessage = null;

      try {
        // Fallback to the literal key if NEXT_PUBLIC_GEMINI_API_KEY is not yet loaded in the terminal env
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyB0SgmPUEibkemaKHNumisnGFCk0k4ROxU';
        if (apiKey) {
          const prompt = `Classify this user voice input into EXACTLY ONE of the following precise navigation keywords based on their intent:
- DASHBOARD (User wants to go home, dashboard, or start page)
- RECORD_SCANNER (User wants to see reports, scan reports, or check medical records)
- FOOD_SCANNER (User wants to see diet, food, meal, or scan food)
- MEDICINES (User wants to check their medication or pills)
- REMINDERS (User wants to manage habits, appointments, or reminders)
- PROGRESS (User wants to see charts or progress)
- UNKNOWN (No clear navigation intent, or just conversational text)

Transcript: "${finalTranscript}"

If there are multiple intents, pick the primary one. If no keywords match, output UNKNOWN.
OUTPUT ONLY THE SINGLE ALL-CAPS KEYWORD WITH NO OTHER TEXT OR PUNCTUATION.`;

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });

          if (res.ok) {
            const data = await res.json();
            const keyword = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || 'UNKNOWN';
            console.log('Gemini Parsed Navigation Keyword:', keyword);

            switch(keyword) {
              case 'DASHBOARD':
                navTarget = '/patient/dashboard';
                navMessage = 'Going to Dashboard...';
                break;
              case 'RECORD_SCANNER':
                navTarget = '/patient/reports';
                navMessage = 'Opening Record Scanner...';
                break;
              case 'FOOD_SCANNER':
                navTarget = '/patient/diet';
                navMessage = 'Opening Food Scanner...';
                break;
              case 'MEDICINES':
                navTarget = '/patient/medicines';
                navMessage = 'Going to Medicines page...';
                break;
              case 'REMINDERS':
                navTarget = '/patient/reminders';
                navMessage = 'Going to Reminders page...';
                break;
              case 'PROGRESS':
                navTarget = '/patient/progress';
                navMessage = 'Going to Progress page...';
                break;
              default:
                navTarget = null;
            }
          }
        }
      } catch (err) {
        console.error('Gemini intent parsing failed:', err);
      }

      if (navTarget) {
        console.log('Voice Navigation Triggered:', navTarget);
        
        // Reply fully on frontend using SpeechSynthesisUtterance
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
           window.speechSynthesis.cancel();
           const msg = new SpeechSynthesisUtterance(navMessage);
           msg.lang = langCfg.code || 'en-US';
           window.speechSynthesis.speak(msg);
        }

        // Navigate
        try {
           router.push(navTarget);
        } catch (err) {
           console.error('router.push failed, using fallback:', err);
           window.location.href = navTarget;
        }

        setIsProcessing(false);
        setStatus('Idle');
        return;
      }

      try {
        const response = await api.post('/assistant/voice', {
          transcript: finalTranscript,
          language: langCfg.gcpCode.split('-')[0], // e.g. "ta" from "ta-IN"
        });

        // User pressed "End Chat" while AI was thinking → discard response silently
        if (stoppingRef.current) { setIsProcessing(false); return; }

        const answer = response?.answer?.trim() || 'மன்னிக்கவும், புரியவில்லை. மீண்டும் சொல்லுங்கள்.';

        speakAndContinue(answer, langCfg);
      } catch {
        // User stopped while we were fetching → don't speak error message
        if (stoppingRef.current) { setIsProcessing(false); return; }
        const fallback = langCfg.gcpCode === 'ta-IN'
          ? 'மன்னிக்கவும், சேவை கிடைக்கவில்லை.'
          : langCfg.gcpCode === 'hi-IN'
          ? 'माफ करें, सेवा अनुपलब्ध है।'
          : 'Sorry, service unavailable. Please try again.';
        speakAndContinue(fallback, langCfg);
      } finally {
        setIsProcessing(false);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}
  }, [router, speakAndContinue]);

  // ── Public: start continuous voice chat with a greeting ───────────────────
  const startListening = useCallback(async () => {
    stoppingRef.current = false;
    continuousRef.current = true;
    stopAllAudio();
    setConversation([]);
    setLastResponse(null);
    setTranscription('');
    setIsOpen(true);          // ← open the overlay
    setStatus('Processing');

    try {
      const res = await api.get('/assistant/greet');
      const greeting = res?.answer || '';
      if (greeting && !stoppingRef.current) {
        // Set state BEFORE calling speakText to avoid race condition
        setStatus('Speaking');
        setIsSpeaking(true);
        setLastResponse(greeting);
        speakText(greeting, langConfig, () => {
          setIsSpeaking(false);
          if (!stoppingRef.current && continuousRef.current) {
            setConversation([{ role: 'assistant', text: greeting }]);
            startListeningInternal(langConfig, true);
          }
        });
      } else {
        startListeningInternal(langConfig, true);
      }
    } catch {
      startListeningInternal(langConfig, true);
    }
  }, [langConfig, startListeningInternal]);

  // ── Public: stop everything and CLOSE the overlay ────────────────────────
  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    continuousRef.current = false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    stopAllAudio();

    // Reset ALL state so overlay closes cleanly
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setIsOpen(false);         // ← close the overlay
    setStatus('Idle');
    setLastResponse(null);
    setTranscription('');
    setConversation([]);      // ← clear history so overlay won't re-show
  }, []);

  const value = {
    isListening, isProcessing, isSpeaking, isOpen,
    status, transcription, lastResponse, conversation,
    language: langConfig.name, langConfig,
    startListening, stopListening, setLangConfig,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};

export const useVoice = () => useContext(VoiceContext);
