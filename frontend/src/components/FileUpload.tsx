import React, { useState, useRef } from 'react';
import { uploadFile } from '../lib/api';

interface UploadedFile {
  name:     string;
  status:   'uploading' | 'success' | 'error';
  message?: string;
}

interface Props { onUploaded?: () => void; }

export const FileUpload: React.FC<Props> = ({ onUploaded }) => {
  const [files, setFiles]         = useState<UploadedFile[]>([]);
  const [isDragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    for (const file of Array.from(fileList)) {
      setFiles(prev => [...prev, { name: file.name, status: 'uploading' }]);
      try {
        const result = await uploadFile(file);
        setFiles(prev => prev.map(f =>
          f.name === file.name && f.status === 'uploading'
            ? { ...f, status: 'success', message: result.message }
            : f
        ));
        onUploaded?.();
      } catch (err: any) {
        setFiles(prev => prev.map(f =>
          f.name === file.name && f.status === 'uploading'
            ? { ...f, status: 'error', message: err.message }
            : f
        ));
      }
    }
  };

  const icon = (s: UploadedFile['status']) =>
    s === 'uploading' ? '⏳' : s === 'success' ? '✅' : '❌';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
        <span>📚</span> Upload Documents
      </h2>

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
        <div className="text-3xl mb-2">📄</div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Drag & drop <strong>.pdf</strong>, <strong>.md</strong>, or <strong>.txt</strong>
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">or click to browse</p>
        <input ref={inputRef} type="file" accept=".pdf,.md,.txt" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
              <span className="mt-0.5">{icon(f.status)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 dark:text-slate-200 truncate">{f.name}</p>
                {f.message && (
                  <p className={`text-xs mt-0.5 ${f.status === 'error' ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                    {f.message}
                  </p>
                )}
                {f.status === 'uploading' && (
                  <p className="text-xs mt-0.5 text-blue-500 animate-pulse">Processing…</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
