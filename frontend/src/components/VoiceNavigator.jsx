import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const VoiceNavigator = ({ language = 'en-US' }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptDisplay, setTranscriptDisplay] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [recognition, setRecognition] = useState(null);
  
  const router = useRouter();

  const LANG_MAP = {
    en: { code: 'en-IN', name: 'English' },
    hi: { code: 'hi-IN', name: 'Hindi' },
    ta: { code: 'ta-IN', name: 'Tamil' },
    te: { code: 'te-IN', name: 'Telugu' },
    kn: { code: 'kn-IN', name: 'Kannada' }
  };

  const { i18n } = useTranslation();
  const [langConfig, setLangConfig] = useState(LANG_MAP.en);

  useEffect(() => {
    const k = (i18n?.language || 'en').replace(/-.*/, '').toLowerCase();
    setLangConfig(LANG_MAP[k] || LANG_MAP.en);
  }, [i18n?.language]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = langConfig.code; 
      recog.maxAlternatives = 1;

      recog.onstart = () => {
        setIsListening(true);
        setTranscriptDisplay('');
        setStatusMessage(`Listening...`);
      };

      recog.onresult = async (event) => {
        let finalTrans = '';
        let interimTrans = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
             finalTrans += event.results[i][0].transcript;
          } else {
             interimTrans += event.results[i][0].transcript;
          }
        }
        
        const currentDisplay = finalTrans || interimTrans;
        if (currentDisplay) setTranscriptDisplay(currentDisplay);

        if (finalTrans) {
          console.log("Navigation Voice final input:", finalTrans);
          setStatusMessage('Processing intent...');
          await handleNavigation(finalTrans.trim());
          setIsListening(false);
        }
      };

      recog.onerror = (event) => {
        console.error("Navigation speech recognition error:", event.error);
        if (event.error !== 'no-speech') {
            setStatusMessage(`Error: ${event.error}`);
        } else {
            setStatusMessage('');
            setTranscriptDisplay('');
        }
        setIsListening(false);
        setTimeout(() => setStatusMessage(''), 3000);
      };

      recog.onend = () => {
        setIsListening(false);
      };

      setRecognition(recog);
    } else {
      console.warn("Speech Recognition API is not supported in this browser.");
    }
  }, [langConfig.code]);

  const fallbackCommandMappings = [
    { 
      keywords: ['dashboard', 'home', 'start', 'health score', 'score', 'scorecard', 'முகப்பு', 'ஸ்கோர்', 'होम', 'स्कोर', 'ಮುಖಪುಟ', 'ಸ್ಟಿಕ್', 'హోమ్', 'స్కోర్'], 
      path: '/patient/dashboard' 
    },
    { 
      keywords: ['report', 'reports', 'record', 'records', 'scan reports', 'health report', 'medical report', 'அறிக்கைகள்', 'பரிசோதனை', 'ரிப்போர்ட்', 'रिपोर्ट', 'ವರದಿ', 'ನಿವೇದಿಕೆ', 'నివేదికలు', 'రిపోర్ట్'], 
      path: '/patient/reports' 
    },
    { 
      keywords: ['diet', 'food', 'meal', 'lunch', 'dinner', 'breakfast', 'உணவு', 'சாப்பாடு', 'आहार', 'खाना', 'ಆಹಾರ', 'ಊಟ', 'ఆహారం', 'భోజనం'], 
      path: '/patient/diet' 
    },
    { 
      keywords: ['medicines', 'medication', 'pills', 'pharmacy', 'tablets', 'மருந்து', 'மருந்துகள்', 'மாத்திரை', 'दवा', 'दवाई', 'ಗೋಲಿ', 'ಔಷಧಿ', 'ಮಾತ್ರೆ', 'మందులు', 'మాత్రలు'], 
      path: '/patient/medicines' 
    },
    { 
      keywords: ['reminders', 'habits', 'appointments', 'schedule', 'alerts', 'நினைவூட்டல்கள்', 'பழக்கங்கள்', 'சந்திப்பு', 'நேரம்', 'रिमाइंडर', 'आदतें', 'अपॉइंटमेंट', 'समय', 'ಜ್ಞಾಪನೆಗಳು', 'ಅಭ್ಯಾಸಗಳು', 'ಅಪಾಯಿಂಟ್ಮೆಂಟ್', 'రిమైండర్‌లు', 'అలవాట్లు', 'అపాయింట్‌మెంట్'], 
      path: '/patient/reminders' 
    },
    { 
      keywords: ['progress', 'charts', 'chart', 'graphs', 'graph', 'statistics', 'stats', 'முன்னேற்றம்', 'வரைபடம்', 'விளக்கப்படம்', 'प्रगति', 'चार्ट', 'ग्राफ़', 'विकास', 'ಪ್ರಗತಿ', 'ಚಾರ್ಟ್', 'ಗ್ರಾಫ್', 'పురోగతి', 'చార్ట్', 'గ్రాఫ్'], 
      path: '/patient/progress' 
    },
    { 
      keywords: ['profile', 'account', 'settings', 'my info', 'details', 'சுயவிவரம்', 'கணக்கு', 'அமைப்புகள்', 'प्रोफ़ाइल', 'खाता', 'सेटिंग्स', 'ಪ್ರೊಫೈಲ್', 'ಖಾತೆ', 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', 'ప్రొఫైల్', 'ఖాతా', 'సెట్టింగ్‌లు'], 
      path: '/patient/profile' 
    },
    { 
      keywords: ['sos', 'emergency', 'help', 'ambulance', 'உதவி', 'அவசரம்', 'मदद', 'आपातकालीन', 'ಸಹಾಯ', 'ತುರ್ತು', 'సహాయం', 'అత్యవసర', 'ఆపద'], 
      path: '/patient/sos' 
    }
  ];

  const handleNavigation = async (finalTranscript) => {
    setIsProcessing(true);
    setStatusMessage('Matching command...');
    
    let matchedPath = null;
    let matchedKeyword = '';

    try {
      const primaryKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY_PRIMARY;
      const secondaryKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY_SECONDARY || 'AIzaSyB0SgmPUEibkemaKHNumisnGFCk0k4ROxU';
      const prompt = `Classify this user voice input into EXACTLY ONE of the following precise navigation keywords based on their intent:
- DASHBOARD (User wants to go home, dashboard, or start page)
- RECORD_SCANNER (User wants to see reports, scan reports, or check medical records)
- FOOD_SCANNER (User wants to see diet, food, meal, or scan food)
- MEDICINES (User wants to check their medication or pills)
- REMINDERS (User wants to manage habits, appointments, or reminders)
- PROGRESS (User wants to see charts or progress)
- HELP (User says SOS, help, emergency)
- UNKNOWN (No clear navigation intent, or just conversational text)

Transcript: "${finalTranscript}"

If there are multiple intents, pick the primary one. If no keywords match, output UNKNOWN.
OUTPUT ONLY THE SINGLE ALL-CAPS KEYWORD WITH NO OTHER TEXT OR PUNCTUATION.`;

      const attemptFetch = async (key) => {
        if (!key) throw new Error("No API key");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!res.ok) throw new Error("Gemini API call failed");
        return res.json();
      };

      let data;
      try {
        data = await attemptFetch(primaryKey);
      } catch (err) {
        console.warn('Primary Gemini API key failed, trying secondary...', err);
        data = await attemptFetch(secondaryKey);
      }

      const keyword = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || 'UNKNOWN';
      console.log('Gemini Parsed Navigation Keyword:', keyword);
      matchedKeyword = keyword;

      switch(keyword) {
        case 'DASHBOARD': matchedPath = '/patient/dashboard'; break;
        case 'RECORD_SCANNER': matchedPath = '/patient/reports'; break;
        case 'FOOD_SCANNER': matchedPath = '/patient/diet'; break;
        case 'MEDICINES': matchedPath = '/patient/medicines'; break;
        case 'REMINDERS': matchedPath = '/patient/reminders'; break;
        case 'PROGRESS': matchedPath = '/patient/progress'; break;
        case 'PROFILE': matchedPath = '/patient/profile'; break;
        case 'HELP': matchedPath = '/patient/sos'; break;
        default: matchedPath = null;
      }
    } catch (err) {
      console.error('Gemini intent parsing failed, using offline fallback:', err);
      const lowerTranscript = finalTranscript.toLowerCase();
      for (const mapping of fallbackCommandMappings) {
        if (mapping.keywords.some(keyword => lowerTranscript.includes(keyword))) {
          matchedPath = mapping.path;
          matchedKeyword = mapping.keywords[0].toUpperCase();
          break;
        }
      }
    }

    if (matchedPath) {
      setStatusMessage(`Navigating to ${matchedKeyword}...`);
      try {
         router.push(matchedPath);
      } catch (err) {
         console.error("Navigate failed, falling back to window.location", err);
         window.location.href = matchedPath;
      }
      setTimeout(() => {
        setTranscriptDisplay('');
        setStatusMessage('');
      }, 2000);
    } else {
      setStatusMessage("Unrecognized navigation command.");
      setTimeout(() => {
        setTranscriptDisplay('');
        setStatusMessage('');
      }, 4000);
    }
    
    setIsProcessing(false);
  };

  const toggleListening = () => {
    if (!recognition) {
      alert("Your browser does not support the Web Speech API.");
      return;
    }

    if (isListening || isProcessing) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
      }
    }
  };

  // Placed on the Bottom-Right, directly above the Voice Assistant mic button
  const buttonStyle = {
    position: 'fixed',
    bottom: 'calc(var(--nav-height, 72px) + 154px + var(--safe-bottom, 16px))',
    right: '20px', 
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: isProcessing ? '#F59E0B' : (isListening ? '#EF4444' : '#10B981'),
    color: '#ffffff',
    border: 'none',
    boxShadow: isListening 
      ? '0 0 15px rgba(239, 68, 68, 0.5), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    zIndex: 9999,
  };

  const popoverStyle = {
    position: 'fixed',
    bottom: 'calc(var(--nav-height, 72px) + 220px + var(--safe-bottom, 16px))', // right above the compass button
    right: '20px',
    backgroundColor: '#1E293B', // Tailwind slate-800
    color: '#F8FAFC',
    padding: '12px 16px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
    maxWidth: '280px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'opacity 0.3s, transform 0.3s',
    pointerEvents: 'none',
    opacity: (isListening || isProcessing || statusMessage || transcriptDisplay) ? 1 : 0,
    transform: (isListening || isProcessing || statusMessage || transcriptDisplay) ? 'translateY(0)' : 'translateY(10px)',
  };

  if (!recognition) return null;

  return (
    <>
      <div style={popoverStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: transcriptDisplay ? '6px' : '0' }}>
          {statusMessage && (
            <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {statusMessage}
            </div>
          )}
          <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', color: '#E2E8F0', fontWeight: '500', marginLeft: '12px' }}>
            {langConfig.name}
          </span>
        </div>
        {transcriptDisplay && (
          <div style={{ fontSize: '16px', lineHeight: '1.4' }}>
            "{transcriptDisplay}"
          </div>
        )}
      </div>

      <button
        onClick={toggleListening}
        style={buttonStyle}
        aria-label={isListening ? "Listening..." : "Click to voice navigate"}
        title="Smart Voice Navigation"
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {isProcessing ? (
          <span style={{ fontSize: '24px', animation: 'spin 2s linear infinite' }}>⏳</span>
        ) : (
          <Compass size={24} />
        )}
      </button>
    </>
  );
};

export default VoiceNavigator;
