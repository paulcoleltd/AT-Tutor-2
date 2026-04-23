import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamMessage, clearHistory, speakWithAI, setProvider, uploadUrl, TeachMode, LLMProvider, ImageAttachment } from '../lib/api';
import { VoiceControls } from './VoiceControls';

// Detect "navigate to / go to / open / load / check / look at <URL>" patterns
const NAV_PATTERN = /(?:navigate\s+to|go\s+to|open|load|check\s+out?|look\s+at|fetch|read|analyse|analyze|play|watch|listen\s+to)\s+(https?:\/\/[^\s]+)/i;
// Also catch bare "what's on https://..." or a URL appearing mid-sentence
const URL_IN_MSG  = /(https?:\/\/[^\s]+)/;

function extractNavUrl(text: string): string | null {
  const m = text.match(NAV_PATTERN) ?? text.match(URL_IN_MSG);
  return m ? m[1].replace(/[.,;!?]+$/, '') : null; // strip trailing punctuation
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
}
function isAudioUrl(url: string): boolean {
  return /\.(mp3|wav|m4a|ogg|flac|aac)(\?|$)/i.test(url);
}

export interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  sources?:  string[];
  timestamp: Date;
  streaming?: boolean;
  image?:    ImageAttachment;
  isError?:  boolean;
}

function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

const WELCOME: Message = {
  id:        makeId(),
  role:      'assistant',
  content:   "Hi! 👋 I'm your **AI Tutor**. Upload a document on the left, then ask me anything about it.\n\nI can **explain** concepts, give you a **quiz**, generate a **summary**, create **flashcards**, or just **chat**!\n\nYou can also attach an 🖼️ image to your message for visual analysis.",
  timestamp: new Date(),
};

const MODE_META: Record<TeachMode, { label: string; icon: string; tip: string }> = {
  explain:   { label: 'Explain',    icon: '💡', tip: 'Detailed explanations with examples' },
  quiz:      { label: 'Quiz',       icon: '📝', tip: 'Get tested on the material' },
  chat:      { label: 'Chat',       icon: '💬', tip: 'Free-form conversation' },
  summarize: { label: 'Summarize',  icon: '📋', tip: 'Structured summary of uploaded docs' },
  flashcard: { label: 'Flashcards', icon: '🃏', tip: 'Generate 5 Q&A flashcard pairs' },
};

const AGENT_COMMANDS: { pattern: RegExp; provider: LLMProvider; name: string }[] = [
  { pattern: /hey\s+agent\s*1|switch\s+to\s+claude|use\s+claude/i,  provider: 'claude', name: 'Claude (Agent 1)'  },
  { pattern: /hey\s+agent\s*2|switch\s+to\s+gemini|use\s+gemini/i,  provider: 'gemini', name: 'Gemini (Agent 2)'  },
  { pattern: /hey\s+agent\s*3|switch\s+to\s+openai|use\s+openai/i,  provider: 'openai', name: 'OpenAI (Agent 3)'  },
];

// Maximum messages kept in state — oldest are trimmed when exceeded
const MAX_MESSAGES = 200;

// Helper: append messages and trim oldest if over the cap
function cappedMessages(prev: Message[], ...toAdd: Message[]): Message[] {
  const next = [...prev, ...toAdd];
  return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
}

// ── Action toolbar shown below each assistant reply ───────────────────────────
interface ToolbarProps {
  msg:        Message;
  isLast:     boolean;
  isLoading:  boolean;
  onDelete:   (id: string) => void;
  onRegenerate: (id: string) => void;
}

const ActionToolbar: React.FC<ToolbarProps> = ({ msg, isLast, isLoading, onDelete, onRegenerate }) => {
  const [copied,   setCopied]   = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = msg.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSpeak = async () => {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    try {
      await speakWithAI(msg.content);
    } catch {
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(msg.content.replace(/[#*`_~[\]]/g, ''));
        u.rate = 0.95;
        u.onend = () => setSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        return;
      }
    }
    setSpeaking(false);
  };

  // Toolbar is always visible for the last message, fades in on hover for older ones
  const visibilityClass = isLast
    ? 'opacity-100'
    : 'opacity-0 group-hover:opacity-100';

  if (msg.streaming || msg.content === '') return null;

  return (
    <div className={`flex items-center gap-1 mt-1 transition-all duration-150 ${msg.isError ? 'justify-start' : 'justify-start'} ${visibilityClass}`}>
      {!msg.isError && (
        <>
          {/* Copy */}
          <button
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy response'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border ${
              copied
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {copied ? (
              <><svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> Copied</>
            ) : (
              <><svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z"/><path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"/></svg> Copy</>
            )}
          </button>

          {/* Speak / Stop speaking */}
          <button
            onClick={handleSpeak}
            title={speaking ? 'Stop speaking' : 'Read aloud'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border ${
              speaking
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 animate-pulse'
                : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {speaking ? (
              <><svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/></svg> Stop</>
            ) : (
              <><svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"/></svg> Speak</>
            )}
          </button>

          {/* Regenerate */}
          <button
            onClick={() => onRegenerate(msg.id)}
            disabled={isLoading}
            title="Regenerate response"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-amber-300 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/></svg>
            Retry
          </button>
        </>
      )}

      {/* Delete — always shown */}
      <button
        onClick={() => onDelete(msg.id)}
        title="Delete message"
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border ${
          msg.isError
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-200'
            : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 hover:border-red-300 hover:text-red-500'
        }`}
      >
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
        {msg.isError ? 'Dismiss' : 'Delete'}
      </button>
    </div>
  );
};

// ── Memoised per-message bubble ───────────────────────────────────────────────
// Wrapped in memo so only the actively-streaming message re-renders on each token;
// all settled messages stay frozen until their own content/sources change.
interface BubbleProps {
  msg:          Message;
  isLastAssistant: boolean;
  isLoading:    boolean;
  onDelete:     (id: string) => void;
  onRegenerate: (id: string) => void;
}

const MessageBubble = memo(({ msg, isLastAssistant, isLoading, onDelete, onRegenerate }: BubbleProps) => (
  // content-visibility:auto lets the browser skip layout/paint for off-screen bubbles
  <div
    className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 120px' }}
  >
    {msg.role === 'assistant' && (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0" aria-hidden="true">🎓</div>
    )}

    <div className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'max-w-[80%] items-end' : 'max-w-[85%] items-start'}`}>
      {/* Bubble */}
      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        msg.role === 'user'
          ? 'bg-blue-600 text-white rounded-br-sm'
          : msg.isError
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-sm'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
      }`}>
        {/* Attached image */}
        {msg.image && (
          <div className="mb-2">
            <img
              src={`data:${msg.image.mimeType};base64,${msg.image.base64}`}
              alt={msg.image.name}
              className="max-w-xs max-h-48 rounded-lg object-contain border border-white/20"
            />
            <p className="text-[10px] mt-1 opacity-70">📎 {msg.image.name}</p>
          </div>
        )}

        {msg.role === 'assistant' ? (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            {msg.streaming && <span className="cursor-blink ml-0.5 text-blue-400">▋</span>}
          </div>
        ) : msg.content}
      </div>

      {/* Source chips */}
      {msg.sources && msg.sources.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 mt-0.5">
          {msg.sources.map(src => (
            <span key={src} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              📄 {src}
            </span>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <span className={`text-[10px] text-slate-400 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>

      {/* Action toolbar — assistant only */}
      {msg.role === 'assistant' && (
        <ActionToolbar
          msg={msg}
          isLast={isLastAssistant}
          isLoading={isLoading}
          onDelete={onDelete}
          onRegenerate={onRegenerate}
        />
      )}

      {/* User message delete (hover only) */}
      {msg.role === 'user' && (
        <button
          onClick={() => onDelete(msg.id)}
          title="Delete message"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400 hover:text-red-500 px-1"
        >
          Delete
        </button>
      )}
    </div>

    {msg.role === 'user' && (
      <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs ml-2 mt-0.5 flex-shrink-0" aria-hidden="true">👤</div>
    )}
  </div>
));
MessageBubble.displayName = 'MessageBubble';

// ── Main Chat component ───────────────────────────────────────────────────────
interface Props {
  sessionId: string;
  onSessionReset: () => string;
  activeProvider?: LLMProvider;
  onProviderSwitch?: (p: LLMProvider) => void;
  onNavigateMedia?: (url: string) => void; // tells App to open MediaPlayer with this URL
  onKbRefresh?: () => void;               // tells App to refresh KB status panel
}

export const Chat: React.FC<Props> = ({ sessionId, onSessionReset, activeProvider, onProviderSwitch, onNavigateMedia, onKbRefresh }) => {
  const [messages,      setMessages]      = useState<Message[]>([WELCOME]);
  const [input,         setInput]         = useState('');
  const [mode,          setMode]          = useState<TeachMode>('explain');
  const [isLoading,     setIsLoading]     = useState(false);
  const [speakEnabled,  setSpeakEnabled]  = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [currentSessId, setCurrentSessId] = useState(sessionId);
  const [pendingImage,   setPendingImage]   = useState<ImageAttachment | null>(null);
  const [focusSourceId,  setFocusSourceId]  = useState<string | undefined>(undefined);
  const [focusSourceUrl, setFocusSourceUrl] = useState<string | undefined>(undefined);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef      = useRef<AbortController | null>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Keep a ref to the last user message + mode so Regenerate can replay it
  const lastUserTurnRef = useRef<{ text: string; mode: TeachMode; image?: ImageAttachment } | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`; }
  }, [input]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPendingImage({ base64: dataUrl.split(',')[1], mimeType: file.type || 'image/jpeg', name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleDeleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const speakText = useCallback((text: string) => {
    if (!speakEnabled) return;
    speakWithAI(text).catch(() => {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text.replace(/[#*`_~[\]]/g, ''));
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  }, [speakEnabled]);

  // Core streaming function — shared by handleSend and handleRegenerate
  const streamReply = useCallback(async (
    userText: string,
    replyMode: TeachMode,
    sessId: string,
    image?: ImageAttachment,
    replaceId?: string,        // if set, replace that message instead of appending
    explicitFocusId?: string,  // override focusSourceId state (needed when state not yet updated)
  ) => {
    setIsLoading(true);
    setError(null);

    const placeholder: Message = {
      id: replaceId ?? makeId(),
      role: 'assistant', content: '', timestamp: new Date(), streaming: true,
    };

    setMessages(prev =>
      replaceId
        ? prev.map(m => m.id === replaceId ? placeholder : m)
        : cappedMessages(prev, placeholder)
    );

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let fullContent = '';
      let sources: string[] = [];

      // explicitFocusId takes precedence over state (avoids stale closure after setFocusSourceId)
      const activeFocusId = explicitFocusId ?? focusSourceId;
      for await (const event of streamMessage(userText, replyMode, sessId, abort.signal, image, activeFocusId)) {
        if (event.error)   { throw new Error(event.error); }
        if (event.sources) { sources = event.sources; }
        if (event.token) {
          fullContent += event.token;
          setMessages(prev => prev.map(m =>
            m.id === placeholder.id ? { ...m, content: fullContent, sources } : m
          ));
        }
        if (event.done) {
          setMessages(prev => prev.map(m =>
            m.id === placeholder.id ? { ...m, streaming: false, sources } : m
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
      setMessages(prev => prev.map(m =>
        m.id === placeholder.id ? { ...m, content: `⚠️ ${msg}`, streaming: false, isError: true } : m
      ));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [speakText, focusSourceId]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setInput('');
    const attachedImage = pendingImage;
    setPendingImage(null);

    // Provider-switch command
    const cmd = AGENT_COMMANDS.find(c => c.pattern.test(trimmed));
    if (cmd) {
      try {
        await setProvider(cmd.provider);
        onProviderSwitch?.(cmd.provider);
        setMessages(prev => cappedMessages(
          prev,
          { id: makeId(), role: 'user',      content: trimmed, timestamp: new Date() },
          { id: makeId(), role: 'assistant',  content: `✅ Switched to **${cmd.name}**. I'm now using ${cmd.name} to answer your questions!`, timestamp: new Date() },
        ));
      } catch (e: any) { setError(e.message); }
      return;
    }

    // ── URL Navigation command ─────────────────────────────────────────────────
    const navUrl = extractNavUrl(trimmed);
    if (navUrl) {
      const userMsg: Message = { id: makeId(), role: 'user', content: trimmed, timestamp: new Date() };
      const loadingMsg: Message = {
        id: makeId(), role: 'assistant', streaming: true,
        content: `🔄 Loading **${navUrl}** into the knowledge base…`,
        timestamp: new Date(),
      };
      setMessages(prev => cappedMessages(prev, userMsg, loadingMsg));

      // Open media player automatically for video/audio URLs
      if (isVideoUrl(navUrl) || isAudioUrl(navUrl)) {
        onNavigateMedia?.(navUrl);
      }

      try {
        const result = await uploadUrl(navUrl);
        const newSourceId = result.sourceId;
        setFocusSourceId(newSourceId);
        setFocusSourceUrl(navUrl);
        onKbRefresh?.();

        // Replace loading message with confirmation + stream the answer
        const confirmMsg: Message = {
          id: loadingMsg.id, role: 'assistant', streaming: false,
          content: `✅ Loaded **${navUrl}** (${result.chunksAdded ?? 0} chunks). I'll now answer your questions from this source first.\n\n---`,
          timestamp: new Date(),
          sources: [result.filename ?? navUrl],
        };
        setMessages(prev => prev.map(m => m.id === loadingMsg.id ? confirmMsg : m));

        // If there's a question in the message beyond the URL, answer it immediately
        const questionPart = trimmed.replace(navUrl, '').replace(NAV_PATTERN, '').replace(/^\s*(and\s+)?(then\s+)?/, '').trim();
        if (questionPart.length > 3) {
          await streamReply(questionPart, mode, currentSessId, undefined, undefined, newSourceId);
        }
      } catch (e: any) {
        setMessages(prev => prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, streaming: false, content: `⚠️ Could not load URL: ${e.message}`, isError: true }
            : m
        ));
      }
      return;
    }

    lastUserTurnRef.current = { text: trimmed, mode, image: attachedImage ?? undefined };

    const userMsg: Message = {
      id: makeId(), role: 'user', content: trimmed,
      timestamp: new Date(), image: attachedImage ?? undefined,
    };
    setMessages(prev => cappedMessages(prev, userMsg));

    await streamReply(trimmed, mode, currentSessId, attachedImage ?? undefined, undefined, focusSourceId);
  }, [input, isLoading, mode, currentSessId, pendingImage, streamReply, onProviderSwitch]);

  // Regenerate: find the user message before this assistant message and replay
  const handleRegenerate = useCallback(async (assistantId: string) => {
    if (isLoading) return;
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === assistantId);
      const userMsg = idx > 0 ? prev[idx - 1] : null;
      if (!userMsg || userMsg.role !== 'user') return prev;
      lastUserTurnRef.current = { text: userMsg.content, mode, image: userMsg.image };
      return prev;
    });

    // Run after state settles
    setTimeout(async () => {
      const turn = lastUserTurnRef.current;
      if (!turn) return;
      await streamReply(turn.text, turn.mode, currentSessId, turn.image, assistantId);
    }, 0);
  }, [isLoading, mode, currentSessId, streamReply]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = async () => {
    abortRef.current?.abort();
    await clearHistory(currentSessId);
    const newId = onSessionReset();
    setCurrentSessId(newId);
    setMessages([{ ...WELCOME, id: makeId() }]);
    setError(null);
    setFocusSourceId(undefined);
    setFocusSourceUrl(undefined);
    lastUserTurnRef.current = null;
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages(prev => prev.map((m, i) =>
      i === prev.length - 1 && m.streaming ? { ...m, streaming: false } : m
    ));
  };

  // Index of last assistant message (for always-visible toolbar)
  const lastAssistantIdx = messages.reduceRight((acc, m, i) => acc === -1 && m.role === 'assistant' ? i : acc, -1);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <h1 className="text-white font-bold text-base">AI Tutor</h1>
          {messages.length > 1 && (
            <span className="text-[10px] text-blue-200 bg-white/10 px-1.5 py-0.5 rounded-full">
              {messages.length}/{MAX_MESSAGES}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div role="group" aria-label="Learning mode" className="flex gap-1">
            {(Object.keys(MODE_META) as TeachMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} title={MODE_META[m].tip}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  mode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:bg-white/20'
                }`}>
                {MODE_META[m].icon} <span className="hidden lg:inline">{MODE_META[m].label}</span>
              </button>
            ))}
          </div>
          <button onClick={handleClear} title="Clear history" aria-label="Clear history"
            className="text-blue-100 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Focused-source banner */}
      {focusSourceUrl && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-700 px-4 py-1.5 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-2 truncate">
          <span>📌 Focused:</span>
          <span className="truncate flex-1 font-medium">{focusSourceUrl}</span>
          <button
            onClick={() => { setFocusSourceId(undefined); setFocusSourceUrl(undefined); }}
            title="Clear focus — answer from all sources"
            className="ml-auto flex-shrink-0 hover:text-indigo-900 dark:hover:text-indigo-100"
            aria-label="Clear focused source"
          >✕</button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="ml-auto" aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-3" role="log" aria-label="Conversation">
        {/* Trim notice — shown when the cap has been hit */}
        {messages.length >= MAX_MESSAGES && (
          <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 py-1 select-none">
            📜 Showing last {MAX_MESSAGES} messages · Start a new session to clear history
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isLastAssistant={idx === lastAssistantIdx}
            isLoading={isLoading}
            onDelete={handleDeleteMessage}
            onRegenerate={handleRegenerate}
          />
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

      {/* Input area */}
      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
        {/* Pending image preview */}
        {pendingImage && (
          <div className="flex items-center gap-2 mb-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2">
            <img
              src={`data:${pendingImage.mimeType};base64,${pendingImage.base64}`}
              alt={pendingImage.name}
              className="w-10 h-10 rounded object-cover border border-blue-200"
            />
            <span className="text-xs text-blue-700 dark:text-blue-300 flex-1 truncate">{pendingImage.name}</span>
            <button onClick={() => setPendingImage(null)} className="text-blue-400 hover:text-red-500 text-xs font-bold">✕</button>
          </div>
        )}

        <div className="flex items-end gap-2 mb-2">
          <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageSelect} />

          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={isLoading}
            title="Attach image"
            aria-label="Attach image"
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all disabled:opacity-40 ${
              pendingImage
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-blue-100 hover:text-blue-600'
            }`}
          >
            🖼️
          </button>

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
