import React, { useState, useRef, useCallback, useEffect } from 'react';
import { uploadUrl } from '../lib/api';

type MediaType = 'video' | 'audio' | 'youtube' | 'vimeo' | 'unknown';

function detectMediaType(url: string): MediaType {
  const u = url.toLowerCase();
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed/.test(u)) return 'youtube';
  if (/vimeo\.com/.test(u)) return 'vimeo';
  if (/\.(mp4|webm|mov|avi|mkv|ogv)(\?|$)/.test(u)) return 'video';
  if (/\.(mp3|wav|m4a|ogg|flac|aac)(\?|$)/.test(u)) return 'audio';
  return 'unknown';
}

function toEmbedUrl(url: string, type: MediaType): string {
  if (type === 'youtube') {
    const idMatch = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([A-Za-z0-9_-]{11})/);
    const id = idMatch?.[1] ?? '';
    // vq=hd1080 requests 1080p; hd=1 enables HD mode; cc_load_policy=0 hides captions overlay
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&hd=1&vq=hd1080&playsinline=1`;
  }
  if (type === 'vimeo') {
    const idMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    const id = idMatch?.[1] ?? '';
    // quality=1080p pins playback to 1080p; transparent=0 removes Vimeo logo overlay
    return `https://player.vimeo.com/video/${id}?badge=0&autopause=0&quality=1080p&transparent=0&dnt=1`;
  }
  return url;
}

interface Props {
  onMediaLoaded?: () => void;
  externalUrl?: string;               // set by App when Chat sends a navigate command
  onExternalUrlConsumed?: () => void; // called after we've consumed the external URL
}

export const MediaPlayer: React.FC<Props> = ({ onMediaLoaded, externalUrl, onExternalUrlConsumed }) => {
  const [url,        setUrl]        = useState('');
  const [activeUrl,  setActiveUrl]  = useState('');
  const [mediaType,  setMediaType]  = useState<MediaType>('unknown');
  const [error,      setError]      = useState('');
  const [speed,      setSpeed]      = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [ingesting,  setIngesting]  = useState(false);
  const [ingestMsg,  setIngestMsg]  = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // When Chat sends a navigation command, auto-load the URL
  useEffect(() => {
    if (externalUrl) {
      setUrl(externalUrl);
      onExternalUrlConsumed?.();
      // Use a small timeout so the state update above flushes before handleLoad reads `url`
      setTimeout(() => {
        const type = detectMediaType(externalUrl);
        setMediaType(type);
        setActiveUrl(type === 'youtube' || type === 'vimeo' ? toEmbedUrl(externalUrl, type) : externalUrl);
        setIsExpanded(true);
        setError('');
        setIngestMsg('');
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalUrl]);

  const handleLoad = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError('');
    setIngestMsg('');
    const type = detectMediaType(trimmed);
    setMediaType(type);
    setActiveUrl(type === 'youtube' || type === 'vimeo' ? toEmbedUrl(trimmed, type) : trimmed);
    setIsExpanded(true);

    // Auto-ingest page/video into KB so the agent can answer questions about it
    if (type === 'youtube' || type === 'vimeo' || type === 'unknown') {
      setIngesting(true);
      try {
        const result = await uploadUrl(trimmed);
        setIngestMsg(`✅ Added to KB: ${result.chunksAdded ?? 0} chunks`);
        onMediaLoaded?.();
      } catch (e: any) {
        setIngestMsg(`⚠️ KB ingest skipped: ${e.message}`);
      } finally {
        setIngesting(false);
      }
    }
  }, [url, onMediaLoaded]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLoad();
  };

  const handleSpeedChange = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const handleError = () => {
    setError('Could not load media. Check the URL or try a direct MP4/WebM link.');
  };

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          🎬 Media Player
          <span className="text-[9px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">HD</span>
        </h3>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* URL input */}
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="YouTube, Vimeo, or direct video URL…"
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleLoad}
              disabled={!url.trim()}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              ▶ Play
            </button>
          </div>

          {/* Supported formats hint */}
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Supports: YouTube · Vimeo · MP4 · WebM · MOV · MP3 · WAV · M4A
            <br />
            <span className="text-blue-400">Any length — streams directly, no size limit</span>
            <br />
            <span className="text-indigo-400">YouTube/Vimeo URLs are auto-added to KB so you can ask questions about them</span>
          </p>

          {/* KB ingestion status */}
          {ingesting && (
            <p className="text-[10px] text-blue-500 animate-pulse">🔄 Adding to knowledge base…</p>
          )}
          {ingestMsg && !ingesting && (
            <p className={`text-[10px] ${ingestMsg.startsWith('✅') ? 'text-green-600 dark:text-green-400' : 'text-amber-500'}`}>
              {ingestMsg}
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
              <span className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</span>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
            </div>
          )}

          {/* Player */}
          {activeUrl && (
            <div className="space-y-2">
              {(mediaType === 'youtube' || mediaType === 'vimeo') && (
                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src={activeUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    title="Media player"
                  />
                </div>
              )}

              {mediaType === 'video' && (
                <video
                  ref={videoRef}
                  controls
                  preload="auto"
                  playsInline
                  onError={handleError}
                  className="w-full rounded-xl bg-black"
                  style={{ objectFit: 'contain', maxHeight: '72vh' }}
                >
                  {/* Prefer WebM (VP9/AV1 — higher quality at same bitrate) then fall back to MP4 */}
                  <source src={activeUrl.replace(/\.(mp4|mov|avi|mkv)(\?|$)/, '.webm$2')} type="video/webm; codecs=vp9" />
                  <source src={activeUrl} type="video/mp4" />
                  <source src={activeUrl} type="video/webm" />
                </video>
              )}

              {mediaType === 'audio' && (
                <audio
                  ref={audioRef}
                  controls
                  preload="auto"
                  src={activeUrl}
                  onError={handleError}
                  className="w-full"
                />
              )}

              {mediaType === 'unknown' && (
                <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                  ⚠️ Could not detect media type. Try a direct .mp4 or YouTube link.
                </div>
              )}

              {/* Playback speed (native video/audio only) */}
              {(mediaType === 'video' || mediaType === 'audio') && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 flex-shrink-0">Speed:</span>
                  <div className="flex gap-1 flex-wrap">
                    {SPEEDS.map(s => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all border ${
                          speed === s
                            ? 'bg-blue-600 text-white border-transparent'
                            : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-blue-300'
                        }`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear */}
              <button
                onClick={() => { setActiveUrl(''); setUrl(''); setError(''); }}
                className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
              >
                ✕ Clear player
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
