import React, { useEffect, useState, useCallback } from 'react';
import { getHealth, deleteDocument } from '../lib/api';

interface Source { sourceId: string; filename: string; chunks: number; type: string; }

interface Props { refreshKey?: number; }

export const KnowledgeBaseStatus: React.FC<Props> = ({ refreshKey }) => {
  const [health,   setHealth]   = useState<{ provider: string; knowledgeBase: { totalChunks: number; sources: Source[] } } | null>(null);
  const [error,    setError]    = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try { setHealth(await getHealth()); setError(false); }
    catch { setError(true); }
  }, []);

  useEffect(() => { fetchHealth(); const t = setInterval(fetchHealth, 5000); return () => clearInterval(t); }, [fetchHealth, refreshKey]);

  const handleDelete = async (sourceId: string) => {
    setDeleting(sourceId);
    try { await deleteDocument(sourceId); await fetchHealth(); }
    catch (e: any) { alert(e.message); }
    finally { setDeleting(null); }
  };

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-xs text-red-600 dark:text-red-400">
      ⚠️ Backend offline — is it running on port 4000?
    </div>
  );
  if (!health) return null;

  const { totalChunks, sources } = health.knowledgeBase;

  const typeIcon = (t: string) => t === 'pdf' ? '📕' : t === 'markdown' ? '📝' : '📄';

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

      <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
        Provider: <strong className="text-slate-500 dark:text-slate-300 ml-0.5">{health.provider}</strong>
      </div>
    </div>
  );
};
