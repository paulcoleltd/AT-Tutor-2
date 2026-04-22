import React, { useState, useRef } from 'react';

interface Props {
  onTranscript:  (text: string) => void;
  speakEnabled:  boolean;
  onToggleSpeak: () => void;
  disabled?:     boolean;
}

export const VoiceControls: React.FC<Props> = ({ onTranscript, speakEnabled, onToggleSpeak, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Speech recognition requires Chrome or Edge.'); return; }

    const r = new SR();
    r.lang            = 'en-US';
    r.interimResults  = false;
    r.maxAlternatives = 1;
    r.onstart  = () => { setIsListening(true); setError(null); };
    r.onresult = (e: any) => { onTranscript(e.results[0][0].transcript); };
    r.onerror  = (e: any) => { setError(`Mic error: ${e.error}`); setIsListening(false); };
    r.onend    = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={isListening ? () => { recognitionRef.current?.stop(); setIsListening(false); } : startListening}
        disabled={disabled}
        title={isListening ? 'Stop listening' : 'Speak your question'}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border disabled:opacity-40 ${
          isListening
            ? 'bg-red-100 text-red-600 border-red-300 animate-pulse dark:bg-red-900/30 dark:border-red-700 dark:text-red-400'
            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
        }`}
      >
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

      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};
