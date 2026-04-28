import React, { useEffect, useState, useCallback } from 'react';
import { getHealth, deleteDocument } from '../lib/api';

interface Source { sourceId: string; filename: string; chunks: number; type: string; }

interface HealthResponse {
  provider: string;
  availableProviders?: string[];
  knowledgeBase: { totalChunks: number; sources: Source[] };
}

interface Props { refreshKey?: number; }

export const KnowledgeBaseStatus: React.FC<Props> = ({ refreshKey }) => {
  const [health,        setHealth]        = useState<HealthResponse | null>(null);
  const [error,         setError]         = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try { setHealth(await getHealth()); setError(false); setErrorDismissed(false); }
    catch { setError(true); }
  }, []);

  // Poll every 30 s — KB changes only on upload/delete, not continuously
  useEffect(() => { fetchHealth(); const t = setInterval(fetchHealth, 30_000); return () => clearInterval(t); }, [fetchHealth, refreshKey]);

  const handleDelete = async (sourceId: string) => {
    setDeleting(sourceId);
    setDeleteError(null);
    try { await deleteDocument(sourceId); await fetchHealth(); }
    catch (e: any) { setDeleteError(e.message); }
    finally { setDeleting(null); }
  };

  if (error && !errorDismissed) return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-xs text-red-600 dark:text-red-400">
      <div className="flex items-start justify-between gap-2">
        <span>⚠️ Backend offline — is it running on port 4000?</span>
        <button
          onClick={() => setErrorDismissed(true)}
          title="Dismiss error"
          className="flex-shrink-0 w-5 h-5 rounded-full bg-red-200 dark:bg-red-800 hover:bg-red-300 dark:hover:bg-red-700 flex items-center justify-center text-[10px] font-bold transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
  if (!health) return null;

  const { totalChunks, sources } = health.knowledgeBase;

  const typeIcon = (t: string) => {
    switch (t) {
      case 'pdf':      return '📕';
      case 'markdown': return '📝';
      case 'docx':     return '📘';
      case 'image':    return '🖼️';
      case 'audio':    return '🎵';
      case 'video':    return '🎬';
      default:         return '📄';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
        🧠 Knowledge Base
      </h3>

      <div className="flex gap-2 mb-3">
        {[{ val: totalChunks, label: 'chunks', color: 'text-blue-600 dark:text-blue-400' },
          { val: sources.length, label: 'docs',   color: 'text-indigo-600 dark:text-indigo-400' }].map(({ val, label, color }) => (
          <div key={label} className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-2 text-center">
            <p className={`text-xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {sources.length > 0 ? (
        <ul className="space-y-1.5">
          {sources.map(s => (
            <li key={s.sourceId} className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2 py-1.5">
              <span>{typeIcon(s.type)}</span>
              <span className="truncate flex-1 text-slate-600 dark:text-slate-300" title={s.filename}>{s.filename}</span>
              <span className="text-slate-400 flex-shrink-0">{s.chunks}c</span>
              <button
                onClick={() => handleDelete(s.sourceId)}
                disabled={deleting === s.sourceId}
                title="Remove from knowledge base"
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-40 flex-shrink-0"
              >
                {deleting === s.sourceId ? '⏳' : '🗑️'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-1">No documents yet.</p>
      )}

      {deleteError && (
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1.5">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600 font-bold flex-shrink-0">✕</button>
        </div>
      )}

      <div className="mt-2 space-y-1 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
          Provider: <strong className="text-slate-500 dark:text-slate-300 ml-0.5">{health.provider}</strong>
        </div>
        {health.availableProviders && health.availableProviders.length > 1 && (
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            ⚡ Auto-fallback enabled across providers: {health.availableProviders.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};
