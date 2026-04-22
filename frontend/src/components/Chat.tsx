import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamMessage, clearHistory, TeachMode } from '../lib/api';
import { VoiceControls } from './VoiceControls';

export interface Message {
  role:      'user' | 'assistant';
  content:   string;
  sources?:  string[];
  timestamp: Date;
  streaming?: boolean;
}

const WELCOME: Message = {
  role:      'assistant',
  content:   "Hi! 👋 I'm your **AI Tutor**. Upload a document on the left, then ask me anything about it.\n\nI can **explain** concepts, give you a **quiz**, generate a **summary**, create **flashcards**, or just **chat**!",
  timestamp: new Date(),
};

const MODE_META: Record<TeachMode, { label: string; icon: string; tip: string }> = {
  explain:   { label: 'Explain',    icon: '💡', tip: 'Detailed explanations with examples' },
  quiz:      { label: 'Quiz',       icon: '📝', tip: 'Get tested on the material' },
  chat:      { label: 'Chat',       icon: '💬', tip: 'Free-form conversation' },
  summarize: { label: 'Summarize',  icon: '📋', tip: 'Structured summary of uploaded docs' },
  flashcard: { label: 'Flashcards', icon: '🃏', tip: 'Generate 5 Q&A flashcard pairs' },
};

interface Props { sessionId: string; onSessionReset: () => string; }

export const Chat: React.FC<Props> = ({ sessionId, onSessionReset }) => {
  const [messages,      setMessages]      = useState<Message[]>([WELCOME]);
  const [input,         setInput]         = useState('');
  const [mode,          setMode]          = useState<TeachMode>('explain');
  const [isLoading,     setIsLoading]     = useState(false);
  const [speakEnabled,  setSpeakEnabled]  = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [currentSessId, setCurrentSessId] = useState(sessionId);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`; }
  }, [input]);

  const speakText = useCallback((text: string) => {
    if (!speakEnabled || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.replace(/[#*`_~]/g, ''));
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [speakEnabled]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setInput('');
    setIsLoading(true);

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() };
    const assistantPlaceholder: Message = { role: 'assistant', content: '', timestamp: new Date(), streaming: true };
    setMessages(prev => [...prev, userMsg, assistantPlaceholder]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let fullContent = '';
      let sources: string[] = [];

      for await (const event of streamMessage(trimmed, mode, currentSessId, abort.signal)) {
        if (event.error)   { throw new Error(event.error); }
        if (event.sources) { sources = event.sources; }
        if (event.token) {
          fullContent += event.token;
          setMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: fullContent, sources } : m
          ));
        }
        if (event.done) {
          setMessages(prev => prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, streaming: false, sources } : m
          ));
          speakText(fullContent);
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = `AI Tutor responded: ${fullContent.slice(0, 100)}`;
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const msg = err.message || 'Unknown error';
      setError(msg);
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: `⚠️ ${msg}`, streaming: false } : m
      ));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, mode, currentSessId, speakText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = async () => {
    abortRef.current?.abort();
    await clearHistory(currentSessId);
    const newId = onSessionReset();
    setCurrentSessId(newId);
    setMessages([WELCOME]);
    setError(null);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages(prev => prev.map((m, i) =>
      i === prev.length - 1 && m.streaming ? { ...m, streaming: false } : m
    ));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <h1 className="text-white font-bold text-base">AI Tutor</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mode tabs */}
          <div role="group" aria-label="Learning mode" className="flex gap-1">
            {(Object.keys(MODE_META) as TeachMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                title={MODE_META[m].tip}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  mode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:bg-white/20'
                }`}
              >
                {MODE_META[m].icon} <span className="hidden lg:inline">{MODE_META[m].label}</span>
              </button>
            ))}
          </div>
          {/* Clear */}
          <button onClick={handleClear} title="Clear history" aria-label="Clear history"
            className="text-blue-100 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="ml-auto" aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-4" role="log" aria-label="Conversation">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0" aria-hidden="true">🎓</div>
            )}
            <div className="flex flex-col gap-1 max-w-[85%]">
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose-chat">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    {msg.streaming && <span className="cursor-blink ml-0.5 text-blue-400">▋</span>}
                  </div>
                ) : msg.content}
              </div>
              {/* Source attribution */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 pl-1">
                  {msg.sources.map(src => (
                    <span key={src} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      📄 {src}
                    </span>
                  ))}
                </div>
              )}
              <span className={`text-xs text-slate-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs ml-2 mt-0.5 flex-shrink-0" aria-hidden="true">👤</div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start" role="status" aria-label="AI Tutor is thinking">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs mr-2 mt-0.5" aria-hidden="true">🎓</div>
            <div className="bg-slate-100 dark:bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-end gap-2 mb-2">
          <label htmlFor="chat-input" className="sr-only">Type your question</label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask your AI Tutor… (${MODE_META[mode].icon} ${MODE_META[mode].label} mode)`}
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all overflow-y-auto disabled:opacity-60"
            style={{ lineHeight: '1.5', maxHeight: '128px' }}
          />
          {isLoading ? (
            <button onClick={handleStop} aria-label="Stop generation"
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all">
              ⏹️
            </button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim()} aria-label="Send"
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          )}
        </div>
        <VoiceControls
          onTranscript={text => setInput(text)}
          speakEnabled={speakEnabled}
          onToggleSpeak={() => setSpeakEnabled(v => !v)}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
