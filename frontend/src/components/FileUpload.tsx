import React, { useState, useRef } from 'react';
import { uploadFile, uploadUrl } from '../lib/api';

interface UploadedFile {
  id:        string;
  name:      string;
  status:    'uploading' | 'success' | 'error';
  message?:  string;
  provider?: string;
  type?:     string;
}

interface Props { onUploaded?: () => void; }

export const FileUpload: React.FC<Props> = ({ onUploaded }) => {
  const [files, setFiles]         = useState<UploadedFile[]>([]);
  const [isDragging, setDragging] = useState(false);
  const [tab, setTab]             = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput]   = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    for (const file of Array.from(fileList)) {
      const id = crypto.randomUUID();
      setFiles(prev => [...prev, { id, name: file.name, status: 'uploading' }]);
      try {
        const result = await uploadFile(file);
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'success', message: result.message, provider: result.provider, type: result.type } : f
        ));
        onUploaded?.();
      } catch (err: any) {
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'error', message: err.message } : f
        ));
      }
    }
  };

  const icon = (s: UploadedFile['status']) =>
    s === 'uploading' ? '⏳' : s === 'success' ? '✅' : '❌';

  const handleUrlSubmit = async () => {
    const url = urlInput.trim();
    if (!url || urlLoading) return;
    setUrlLoading(true);
    const id = crypto.randomUUID();
    const label = url.length > 40 ? url.slice(0, 40) + '…' : url;
    setFiles(prev => [...prev, { id, name: label, status: 'uploading' }]);
    try {
      const result = await uploadUrl(url);
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'success', message: result.message } : f
      ));
      setUrlInput('');
      onUploaded?.();
    } catch (err: any) {
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'error', message: err.message } : f
      ));
    } finally {
      setUrlLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
        <span>📚</span> Upload to Knowledge Base
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(['file', 'url'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}>
            {t === 'file' ? '📄 File' : '🔗 URL'}
          </button>
        ))}
      </div>

      {tab === 'file' ? (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        >
          <div className="text-3xl mb-2">📁</div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Drag & drop any file</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            <strong>Docs:</strong> PDF, DOCX, MD, TXT<br/>
            <strong>Media:</strong> JPG, PNG, GIF, WEBP · MP3, WAV, M4A · MP4, MOV, AVI<br/>
            <span className="text-blue-400">Includes USB drives &amp; external storage</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">or click to browse (any location)</p>
          <input ref={inputRef} type="file"
            accept=".pdf,.docx,.md,.txt,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.m4a,.ogg,.webm,.flac,.mp4,.mov,.avi,.mkv"
            multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="https://example.com/article"
            disabled={urlLoading}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim() || urlLoading}
            className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {urlLoading ? 'Fetching…' : '🔗 Ingest URL'}
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500">Supports webpages and PDF links</p>
        </div>
      )}

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f) => (
            <li key={f.id} className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
              f.status === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-slate-50 dark:bg-slate-700/50'
            }`}>
              <span className="mt-0.5">{icon(f.status)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{f.name}</p>
                {f.message && (
                  <p className={`text-xs mt-0.5 ${f.status === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {f.message}
                  </p>
                )}
                {f.status === 'success' && f.provider && ['image','audio','video'].includes(f.type ?? '') && (
                  <p className="text-[10px] mt-0.5 text-blue-500 dark:text-blue-400">
                    🤖 Processed by <strong>{f.provider}</strong>
                  </p>
                )}
                {f.status === 'uploading' && (
                  <p className="text-xs mt-0.5 text-blue-500 animate-pulse">
                    {f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼️ Analysing with AI…' :
                     f.name.match(/\.(mp3|wav|m4a|ogg|flac)$/i) ? '🎵 Transcribing audio…' :
                     f.name.match(/\.(mp4|mov|avi|mkv)$/i) ? '🎬 Transcribing video…' : 'Processing…'}
                  </p>
                )}
              </div>
              {/* Delete / dismiss button — always visible, especially prominent on errors */}
              {f.status !== 'uploading' && (
                <button
                  onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))}
                  title="Remove from list"
                  aria-label="Remove from list"
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors mt-0.5 ${
                    f.status === 'error'
                      ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 hover:bg-red-400 hover:text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-500 hover:bg-red-400 hover:text-white'
                  }`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {files.some(f => f.status !== 'uploading') && (
        <button
          onClick={() => setFiles(prev => prev.filter(f => f.status === 'uploading'))}
          className="mt-2 w-full text-xs text-slate-400 hover:text-red-500 transition-colors py-1"
        >
          Clear all completed
        </button>
      )}
    </div>
  );
};
