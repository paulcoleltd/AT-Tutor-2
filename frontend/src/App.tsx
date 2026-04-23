import React, { useState } from 'react';
import { Chat } from './components/Chat';
import { FileUpload } from './components/FileUpload';
import { KnowledgeBaseStatus } from './components/KnowledgeBaseStatus';
import { ProviderSwitcher } from './components/ProviderSwitcher';
import { MediaPlayer } from './components/MediaPlayer';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDarkMode } from './hooks/useDarkMode';
import { useSession } from './hooks/useSession';
import { LLMProvider } from './lib/api';

const App: React.FC = () => {
  const { dark, toggle } = useDarkMode();
  const { sessionId, resetSession } = useSession();
  const [kbRefreshKey, setKbRefreshKey] = useState(0);
  const [activeProvider, setActiveProvider] = useState<LLMProvider>('claude');
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center gap-3 shadow-sm">
        <span className="text-2xl" aria-hidden="true">🎓</span>
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">AI Tutor Agent</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">Upload docs · Ask questions · Learn smarter</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            RAG + Streaming
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
            5 Modes
          </span>
          <ThemeToggle dark={dark} onToggle={toggle} />
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex gap-4 p-4 max-w-7xl mx-auto w-full overflow-hidden" style={{ height: 'calc(100vh - 65px)' }}>
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto" aria-label="Sidebar">
          <ErrorBoundary>
            <FileUpload onUploaded={() => setKbRefreshKey(k => k + 1)} />
          </ErrorBoundary>

          <ErrorBoundary>
            <KnowledgeBaseStatus refreshKey={kbRefreshKey} />
          </ErrorBoundary>

          <ErrorBoundary>
            <ProviderSwitcher onSwitch={setActiveProvider} />
          </ErrorBoundary>

          <ErrorBoundary>
            <MediaPlayer
              onMediaLoaded={() => setKbRefreshKey(k => k + 1)}
              externalUrl={mediaUrl}
              onExternalUrlConsumed={() => setMediaUrl(undefined)}
            />
          </ErrorBoundary>

          {/* Tips */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span>💡</span> Tips
            </h2>
            <ol className="space-y-2 text-xs text-slate-500 dark:text-slate-400 list-none">
              {[
                'Upload a PDF, Word (.docx), Markdown, or TXT file to seed the knowledge base.',
                'Use 💡 Explain for in-depth breakdowns with examples.',
                'Use 📝 Quiz to test your understanding interactively.',
                'Use 📋 Summarize for a structured overview of any document.',
                'Use 🃏 Flashcards to get 5 Q&A pairs for quick revision.',
                'Responses stream live — hit ⏹️ to stop mid-reply.',
                'Click 🗑️ next to a document to remove it from the knowledge base.',
              ].map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-400 font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Config */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4">
            <h2 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
              ⚙️ Configuration
            </h2>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Set API keys in{' '}
              <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">backend/.env</code>.
              Supports OpenAI, Claude (default), and Gemini.
            </p>
          </div>
        </aside>

        {/* Chat panel */}
        <section className="flex-1 min-h-0 min-w-0" aria-label="Chat panel">
          <ErrorBoundary>
            <Chat
              sessionId={sessionId}
              onSessionReset={resetSession}
              activeProvider={activeProvider}
              onProviderSwitch={setActiveProvider}
              onNavigateMedia={url => setMediaUrl(url)}
              onKbRefresh={() => setKbRefreshKey(k => k + 1)}
            />
          </ErrorBoundary>
        </section>
      </main>
    </div>
  );
};

export default App;
