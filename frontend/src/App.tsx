import React, { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { FileUpload } from './components/FileUpload';
import { KnowledgeBaseStatus } from './components/KnowledgeBaseStatus';
import { ProviderSwitcher } from './components/ProviderSwitcher';
import { MediaPlayer } from './components/MediaPlayer';
import { ProgressDashboard } from './components/ProgressDashboard';
import { LearningRoadmap } from './components/LearningRoadmap';
import { SetupGuide } from './components/SetupGuide';
import { useProgressTracker } from './hooks/useProgressTracker';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserProfile } from './components/UserProfile';
import { SessionMemory } from './components/SessionMemory';
import { ErrorLog } from './components/ErrorLog';
import { useDarkMode } from './hooks/useDarkMode';
import { useSession } from './hooks/useSession';
import { useUserProfile } from './hooks/useUserProfile';
import { useSessionMemory, SessionSnapshot, deriveTopic } from './hooks/useSessionMemory';
import { useErrorLog } from './hooks/useErrorLog';
import { getHealth, LLMProvider } from './lib/api';

const App: React.FC = () => {
  const { dark, toggle } = useDarkMode();
  const { sessionId, resetSession, resumeSession } = useSession();
  const [kbRefreshKey, setKbRefreshKey] = useState(0);
  const [activeProvider, setActiveProvider] = useState<LLMProvider>('claude');
  const [mediaUrl, setMediaUrl]       = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSetup, setShowSetup]     = useState(false);

  // Show setup guide if backend is unreachable on first load
  useEffect(() => {
    if (window.location.hostname === 'localhost') return;
    const dismissed = sessionStorage.getItem('setup-dismissed');
    if (dismissed) return;
    getHealth().catch(() => setShowSetup(true));
  }, []);

  // ── New feature hooks ──────────────────────────────────────────────────────
  const profileHook    = useUserProfile();
  const memoryHook     = useSessionMemory();
  const errorLogHook   = useErrorLog();
  const progressHook   = useProgressTracker();

  // Callback from Chat to save a session snapshot when conversation has substance
  const handleSaveSnapshot = (snap: Omit<SessionSnapshot, 'topic'> & { messages: Array<{role: string; content: string}> }) => {
    const { messages, ...rest } = snap;
    memoryHook.saveSnapshot({ ...rest, topic: deriveTopic(messages) });
  };

  // Resume a saved session — loads its chat history from localStorage
  const handleResumeSession = (resumeSessionId: string) => {
    // The Chat component reads from localStorage keyed by sessionId;
    // passing the saved sessionId causes it to rehydrate that conversation.
    // We accomplish this by resetting to the saved session ID.
    window.location.href = window.location.pathname + `?resume=${resumeSessionId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex flex-col transition-colors duration-200">
      {showSetup && (
        <SetupGuide onDismiss={() => { setShowSetup(false); sessionStorage.setItem('setup-dismissed', '1'); }} />
      )}
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 flex items-center gap-3 shadow-sm">

        {/* Hamburger — visible on mobile only */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          className="md:hidden p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          {sidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <span className="text-2xl" aria-hidden="true">🎓</span>
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">AI Tutor Agent</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">Upload docs · Ask questions · Learn smarter</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Error badge in header when errors exist */}
          {errorLogHook.hasErrors && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="hidden sm:inline-flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full font-medium animate-pulse"
              title="View error log"
            >
              ⚠️ {errorLogHook.errorCount} error{errorLogHook.errorCount !== 1 ? 's' : ''}
            </button>
          )}
          <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            RAG + Streaming
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium">
            6 Modes
          </span>
          <ThemeToggle dark={dark} onToggle={toggle} />
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex gap-4 p-4 max-w-7xl mx-auto w-full overflow-hidden relative" style={{ height: 'calc(100vh - 65px)' }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={[
            'flex-shrink-0 flex flex-col gap-4 overflow-y-auto w-72',
            'md:relative md:flex md:z-auto md:shadow-none md:bg-transparent md:p-0',
            sidebarOpen
              ? 'flex absolute inset-y-0 left-0 z-20 bg-white dark:bg-slate-900 p-4 shadow-2xl rounded-r-2xl'
              : 'hidden',
          ].join(' ')}
          aria-label="Sidebar"
        >
          {/* Upload */}
          <ErrorBoundary>
            <FileUpload
              onUploaded={() => { setKbRefreshKey(k => k + 1); progressHook.logDocUploaded(); }}
              onError={(msg) => errorLogHook.log('error', 'FileUpload', msg)}
            />
          </ErrorBoundary>

          {/* Knowledge Base status */}
          <ErrorBoundary>
            <KnowledgeBaseStatus refreshKey={kbRefreshKey} />
          </ErrorBoundary>

          {/* User Profile */}
          <ErrorBoundary>
            <UserProfile />
          </ErrorBoundary>

          {/* Session Memory */}
          <ErrorBoundary>
            <SessionMemory
              sessions={memoryHook.sessions}
              currentSessionId={sessionId}
              onResume={handleResumeSession}
              onDelete={memoryHook.deleteSnapshot}
              onClearAll={memoryHook.clearAll}
            />
          </ErrorBoundary>

          {/* Learning Roadmap */}
          <ErrorBoundary>
            <LearningRoadmap />
          </ErrorBoundary>

          {/* Progress Dashboard */}
          <ErrorBoundary>
            <ProgressDashboard
              progress={progressHook.progress}
              topSubject={progressHook.topSubject}
              studyDays={progressHook.studyDays}
              onReset={progressHook.resetProgress}
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <ProviderSwitcher onSwitch={setActiveProvider} />
          </ErrorBoundary>

          {/* Media Player */}
          <ErrorBoundary>
            <MediaPlayer
              onMediaLoaded={() => setKbRefreshKey(k => k + 1)}
              externalUrl={mediaUrl}
              onExternalUrlConsumed={() => setMediaUrl(undefined)}
            />
          </ErrorBoundary>

          {/* Error Log */}
          <ErrorBoundary>
            <ErrorLog
              entries={errorLogHook.entries}
              errorCount={errorLogHook.errorCount}
              onClear={errorLogHook.clearLog}
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
                'Fill in My Profile so the AI adapts to your background and goals.',
                'Use Memory panel to resume any previous conversation.',
                'Check Error Log if something behaves unexpectedly.',
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
              Local: set keys in <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">backend/.env</code>.{' '}
              Vercel: add <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">ANTHROPIC_API_KEY</code> under Project → Settings → Environment Variables.
            </p>
            {window.location.hostname !== 'localhost' && (
              <button
                onClick={() => setShowSetup(true)}
                className="mt-2 text-[10px] text-amber-700 dark:text-amber-400 underline hover:no-underline"
              >
                View setup guide →
              </button>
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <section className="flex-1 min-h-0 min-w-0" aria-label="Chat panel">
          <ErrorBoundary>
            <Chat
              sessionId={sessionId}
              onSessionReset={resetSession}
              onSessionResume={resumeSession}
              activeProvider={activeProvider}
              onProviderSwitch={setActiveProvider}
              onNavigateMedia={url => setMediaUrl(url)}
              onKbRefresh={() => setKbRefreshKey(k => k + 1)}
              userProfile={profileHook.profile}
              onSaveSnapshot={handleSaveSnapshot}
              buildResumeContext={memoryHook.buildResumeContext}
              onLogError={(source, msg, detail) => errorLogHook.log('error', source, msg, detail)}
              onLogWarn={(source, msg) => errorLogHook.log('warn', source, msg)}
              onLogInfo={(source, msg) => errorLogHook.log('info', source, msg)}
              onLogMessage={progressHook.logMessage}
              onLogSession={progressHook.logSession}
            />
          </ErrorBoundary>
        </section>
      </main>
    </div>
  );
};

export default App;
