import React, { useEffect, useState, useCallback } from 'react';
import { getProvider, setProvider, LLMProvider } from '../lib/api';

const PROVIDER_META: Record<LLMProvider, { label: string; icon: string; agent: string; color: string }> = {
  claude:  { label: 'Claude',  icon: '🟣', agent: 'Agent 1', color: 'bg-violet-600 text-white' },
  gemini:  { label: 'Gemini',  icon: '🔵', agent: 'Agent 2', color: 'bg-blue-600 text-white'   },
  openai:  { label: 'OpenAI',  icon: '🟢', agent: 'Agent 3', color: 'bg-green-600 text-white'  },
};

interface Props {
  onSwitch?: (provider: LLMProvider) => void;
}

export const ProviderSwitcher: React.FC<Props> = ({ onSwitch }) => {
  const [active,    setActive]    = useState<LLMProvider>('claude');
  const [available, setAvailable] = useState<LLMProvider[]>(['claude']);
  const [switching, setSwitching] = useState(false);

  const refresh = useCallback(async () => {
    try { const d = await getProvider(); setActive(d.active); setAvailable(d.available); }
    catch {}
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 30 s — provider changes only on explicit user action
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleSwitch = async (provider: LLMProvider) => {
    if (provider === active || switching) return;
    setSwitching(true);
    try {
      const res = await setProvider(provider);
      setActive(res.active);
      onSwitch?.(res.active);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
        🤖 AI Provider
      </h3>
      <div className="flex flex-col gap-1.5">
        {(Object.keys(PROVIDER_META) as LLMProvider[]).map(p => {
          const meta = PROVIDER_META[p];
          const isActive = p === active;
          const isAvail  = available.includes(p);
          return (
            <button
              key={p}
              onClick={() => handleSwitch(p)}
              disabled={!isAvail || switching}
              title={isAvail ? `Switch to ${meta.label} (${meta.agent})` : `No API key for ${meta.label}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                isActive
                  ? `${meta.color} border-transparent shadow-sm`
                  : isAvail
                    ? 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600'
                    : 'bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 cursor-not-allowed opacity-50'
              }`}
            >
              <span>{meta.icon}</span>
              <span className="flex-1 text-left">{meta.label}</span>
              <span className="opacity-60">{meta.agent}</span>
              {isActive && <span className="text-[10px] font-semibold bg-white/20 px-1.5 py-0.5 rounded-full">active</span>}
              {!isAvail && <span className="text-[10px]">no key</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        Say <strong>"Hey Agent 1"</strong>, <strong>"Agent 2"</strong>, or <strong>"Agent 3"</strong> to switch by voice.
        {available.length > 1 && ' Auto-fallback across providers is enabled for more robust responses.'}
      </p>
    </div>
  );
};
