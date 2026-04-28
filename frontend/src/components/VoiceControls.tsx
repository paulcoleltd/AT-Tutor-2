import React, { useState, useRef, useEffect } from 'react';
import { speakWithAI, fetchTtsBlob } from '../lib/api';

interface Props {
  onTranscript:  (text: string) => void;
  speakEnabled:  boolean;
  onToggleSpeak: () => void;
  lastAnswer?:   string;   // most recent AI response — for "read last answer" button
  disabled?:     boolean;
}

type MicPermission = 'unknown' | 'granted' | 'denied' | 'prompt';

export const VoiceControls: React.FC<Props> = ({
  onTranscript, speakEnabled, onToggleSpeak, lastAnswer, disabled,
}) => {
  const [isListening,   setIsListening]   = useState(false);
  const [micError,      setMicError]      = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<MicPermission>('unknown');
  const [isReading,     setIsReading]     = useState(false);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Mic permission probe ─────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      if (!navigator.permissions) return;
      try {
        const s = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(s.state as MicPermission);
        s.onchange = () => { setMicPermission(s.state as MicPermission); if (s.state === 'granted') setMicError(null); };
      } catch {}
    };
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  // ── Mic (speech-to-text) ─────────────────────────────────────────────────────
  const startListening = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicError('Requires Chrome or Edge.'); return; }
    if (micPermission === 'denied') {
      setMicError('Blocked — click 🔒 in address bar → Microphone → Allow → refresh.');
      return;
    }
    if (micPermission !== 'granted') {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach(t => t.stop());
        setMicPermission('granted'); setMicError(null);
      } catch (e: any) {
        setMicPermission('denied');
        setMicError('Blocked — click 🔒 in address bar → Microphone → Allow → refresh.');
        return;
      }
    }
    const r = new SR();
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
    r.onstart  = () => { setIsListening(true); setMicError(null); };
    r.onresult = (e: any) => onTranscript(e.results[0][0].transcript);
    r.onerror  = (e: any) => {
      if (e.error === 'not-allowed') { setMicPermission('denied'); setMicError('Blocked — click 🔒 → Microphone → Allow → refresh.'); }
      else setMicError(`Mic error: ${e.error}`);
      setIsListening(false);
    };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
  };

  const stopListening = () => { recognitionRef.current?.stop(); setIsListening(false); };

  // ── Speaker (text-to-speech) — no mic needed ─────────────────────────────────
  const readAloud = async (text: string) => {
    if (!text) return;
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      if (isReading) { setIsReading(false); return; } // second click = stop
    }
    setIsReading(true);
    try {
      // Try AI TTS (OpenAI) first — rich, natural voice
      const blob = await fetchTtsBlob(text.replace(/[#*`_~[\]>]/g, '').slice(0, 4000));
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setIsReading(false); currentAudioRef.current = null; };
      audio.onerror = () => { setIsReading(false); currentAudioRef.current = null; };
      await audio.play();
      return;
    } catch {}
    // Fallback — browser built-in speech synthesis (works offline, no API key needed)
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[#*`_~[\]>]/g, ''));
      u.rate = 0.95;
      u.onend = () => setIsReading(false);
      window.speechSynthesis.speak(u);
    } else {
      setIsReading(false);
    }
  };

  const micDot =
    micPermission === 'granted' ? 'bg-green-400' :
    micPermission === 'denied'  ? 'bg-red-400'   :
    micPermission === 'prompt'  ? 'bg-yellow-400' : 'bg-slate-300 dark:bg-slate-500';

  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* ── 🎙️ Microphone — speech to text ─────────────────────────── */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          title={
            micPermission === 'granted' ? (isListening ? 'Stop listening' : 'Speak your question (mic)') :
            micPermission === 'denied'  ? 'Mic blocked — click to see fix' :
            'Click to speak your question'
          }
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border disabled:opacity-40 ${
            isListening
              ? 'bg-red-100 text-red-600 border-red-300 animate-pulse dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
              : micPermission === 'denied'
              ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${micDot}`} />
          <span>{isListening ? '⏹️' : '🎙️'}</span>
          <span className="hidden sm:inline">{isListening ? 'Stop' : 'Dictate'}</span>
        </button>
        {micError && (
          <span className="text-[10px] text-red-500 max-w-[160px] leading-tight">{micError}</span>
        )}
      </div>

      {/* ── 🔊 Speaker — text to speech (no mic needed) ─────────────── */}
      <button
        onClick={onToggleSpeak}
        title={speakEnabled ? 'Auto-read responses: ON — click to turn off' : 'Auto-read responses: OFF — click to turn on'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
          speakEnabled
            ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
        }`}
      >
        🔊
        <span className="hidden sm:inline">{speakEnabled ? 'Auto-read: On' : 'Auto-read: Off'}</span>
      </button>

      {/* ── ▶ Read last answer — one-shot replay (no mic needed) ─────── */}
      {lastAnswer && (
        <button
          onClick={() => readAloud(lastAnswer)}
          disabled={disabled}
          title={isReading ? 'Stop reading' : 'Read last answer aloud (no mic needed)'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border disabled:opacity-40 ${
            isReading
              ? 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
          }`}
        >
          {isReading ? '⏹' : '▶'}
          <span className="hidden sm:inline">{isReading ? 'Stop' : 'Read answer'}</span>
        </button>
      )}

    </div>
  );
};
