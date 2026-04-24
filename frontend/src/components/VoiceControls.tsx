import React, { useState, useRef, useEffect } from 'react';

interface Props {
  onTranscript:  (text: string) => void;
  speakEnabled:  boolean;
  onToggleSpeak: () => void;
  disabled?:     boolean;
}

type MicPermission = 'unknown' | 'granted' | 'denied' | 'prompt';

export const VoiceControls: React.FC<Props> = ({ onTranscript, speakEnabled, onToggleSpeak, disabled }) => {
  const [isListening,    setIsListening]    = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [micPermission,  setMicPermission]  = useState<MicPermission>('unknown');
  const recognitionRef = useRef<any>(null);

  // Check mic permission on mount and whenever the window regains focus
  useEffect(() => {
    const checkPermission = async () => {
      if (!navigator.permissions) return;
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(status.state as MicPermission);
        status.onchange = () => {
          setMicPermission(status.state as MicPermission);
          if (status.state === 'granted') setError(null);
        };
      } catch {
        // permissions API not supported — leave as 'unknown'
      }
    };
    checkPermission();
    window.addEventListener('focus', checkPermission);
    return () => window.removeEventListener('focus', checkPermission);
  }, []);

  const startListening = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition requires Chrome or Edge.');
      return;
    }

    // If permission is denied, guide the user rather than just erroring
    if (micPermission === 'denied') {
      setError('Mic blocked. Click the 🔒 lock in the address bar → Microphone → Allow → refresh.');
      return;
    }

    // Request mic access first (so Chrome prompts before SpeechRecognition tries)
    if (micPermission !== 'granted') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop()); // immediately release — just needed to trigger prompt
        setMicPermission('granted');
        setError(null);
      } catch (e: any) {
        if (e.name === 'NotAllowedError') {
          setMicPermission('denied');
          setError('Mic blocked. Click the 🔒 lock in the address bar → Microphone → Allow → refresh.');
        } else {
          setError(`Mic error: ${e.message}`);
        }
        return;
      }
    }

    const r = new SR();
    r.lang            = 'en-US';
    r.interimResults  = false;
    r.maxAlternatives = 1;
    r.onstart  = () => { setIsListening(true); setError(null); };
    r.onresult = (e: any) => { onTranscript(e.results[0][0].transcript); };
    r.onerror  = (e: any) => {
      if (e.error === 'not-allowed') {
        setMicPermission('denied');
        setError('Mic blocked. Click the 🔒 lock in the address bar → Microphone → Allow → refresh.');
      } else {
        setError(`Mic error: ${e.error}`);
      }
      setIsListening(false);
    };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const micStatusDot =
    micPermission === 'granted'  ? 'bg-green-400' :
    micPermission === 'denied'   ? 'bg-red-400'   :
    micPermission === 'prompt'   ? 'bg-yellow-400' :
    'bg-slate-300';

  const micTitle =
    micPermission === 'granted'  ? 'Microphone: allowed' :
    micPermission === 'denied'   ? 'Microphone: blocked — click to see how to fix' :
    micPermission === 'prompt'   ? 'Click to allow microphone access' :
    'Click to speak your question';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        title={micTitle}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border disabled:opacity-40 ${
          isListening
            ? 'bg-red-100 text-red-600 border-red-300 animate-pulse dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
            : micPermission === 'denied'
            ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
        }`}
      >
        {/* Permission status dot */}
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${micStatusDot}`} />
        {isListening ? '⏹️' : '🎙️'}
        <span className="hidden sm:inline">{isListening ? 'Stop' : 'Speak'}</span>
      </button>

      <button
        onClick={onToggleSpeak}
        title={speakEnabled ? 'Disable voice answers' : 'Enable voice answers'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
          speakEnabled
            ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'
        }`}
      >
        🔊 <span className="hidden sm:inline">{speakEnabled ? 'Voice On' : 'Voice Off'}</span>
      </button>

      {error && (
        <span className="text-xs text-red-500 max-w-[200px] leading-tight">{error}</span>
      )}
    </div>
  );
};
