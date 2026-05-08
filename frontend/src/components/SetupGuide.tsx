import React, { useState } from 'react';

interface Props {
  onDismiss: () => void;
}

const STEPS = [
  {
    n: 1,
    icon: '🔑',
    title: 'Get an API key',
    body: 'Sign in to the Anthropic Console and create a new API key.',
    action: { label: 'Open Anthropic Console →', url: 'https://console.anthropic.com/keys' },
    code: 'ANTHROPIC_API_KEY=sk-ant-...',
  },
  {
    n: 2,
    icon: '⚙️',
    title: 'Add it to Vercel',
    body: 'Go to your Vercel project → Settings → Environment Variables and add:',
    action: { label: 'Open Vercel Settings →', url: 'https://vercel.com/dashboard' },
    code: 'ANTHROPIC_API_KEY   =   sk-ant-your-key-here',
  },
  {
    n: 3,
    icon: '🚀',
    title: 'Redeploy',
    body: 'After saving the env var, trigger a new deployment (Vercel → Deployments → Redeploy).',
    action: null,
    code: null,
  },
];

export const SetupGuide: React.FC<Props> = ({ onDismiss }) => {
  const [copied, setCopied] = useState<number | null>(null);

  const copy = (text: string, step: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(step);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎓</span>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">Setup Required</h2>
                <p className="text-blue-200 text-xs mt-0.5">Add an API key to activate the AI Tutor</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 space-y-5">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-4">
              {/* Step number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{step.n}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span>{step.icon}</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{step.title}</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{step.body}</p>

                {/* Code block */}
                {step.code && (
                  <div className="flex items-center gap-2 bg-slate-900 dark:bg-slate-950 rounded-lg px-3 py-2 mb-2">
                    <code className="text-[11px] text-green-400 font-mono flex-1 truncate">{step.code}</code>
                    <button
                      onClick={() => copy(step.code!, step.n)}
                      className="text-slate-400 hover:text-white transition-colors flex-shrink-0 text-[10px]"
                      title="Copy"
                    >
                      {copied === step.n ? '✓' : '📋'}
                    </button>
                  </div>
                )}

                {/* Action link */}
                {step.action && (
                  <a
                    href={step.action.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {step.action.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Supported providers */}
        <div className="px-6 pb-5">
          <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Also supported</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {[
                { icon: '🟠', label: 'OpenAI',  key: 'OPENAI_API_KEY' },
                { icon: '🔵', label: 'Gemini',  key: 'GEMINI_API_KEY' },
              ].map(p => (
                <div key={p.key} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span>{p.icon}</span>
                  <code className="text-[10px] bg-slate-200 dark:bg-slate-600 px-1 rounded">{p.key}</code>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Continue without AI
          </button>
          <a
            href="https://console.anthropic.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white text-center transition-colors"
          >
            Get API Key →
          </a>
        </div>
      </div>
    </div>
  );
};
