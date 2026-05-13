const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export type TeachMode = 'explain' | 'quiz' | 'chat' | 'summarize' | 'flashcard' | 'exam';

export interface UploadResult {
  success:      boolean;
  message:      string;
  sourceId?:    string;
  chunksAdded?: number;
  filename?:    string;
  type?:        string;
  provider?:    string;
}

export interface ChatResult {
  answer:  string;
  sources: string[];
}

export interface ExamResult {
  score:        number;
  total:        number;
  grade:        string;
  improvements: string[];
}

export interface StreamEvent {
  token?:      string;
  sources?:    string[];
  done?:       boolean;
  error?:      string;
  cleanText?:  string;
  examResult?: ExamResult;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.json(); msg = b.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.append('file', file);
  return handle<UploadResult>(await fetch(`${BASE_URL}/upload`, { method: 'POST', body }));
}

/** Upload a file and report progress (0–100) via the onProgress callback. */
export function uploadFileWithProgress(
  file: File,
  onProgress: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr  = new XMLHttpRequest();
    const body = new FormData();
    body.append('file', file);

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as UploadResult); }
        catch { reject(new Error('Invalid response from server.')); }
      } else {
        try { reject(new Error((JSON.parse(xhr.responseText) as { error?: string }).error ?? `HTTP ${xhr.status}`)); }
        catch { reject(new Error(`HTTP ${xhr.status}`)); }
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
    xhr.open('POST', `${BASE_URL}/upload`);
    xhr.send(body);
  });
}

export async function uploadUrl(url: string): Promise<UploadResult> {
  return handle<UploadResult>(await fetch(`${BASE_URL}/upload/url`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url }),
  }));
}

export async function deleteDocument(sourceId: string): Promise<void> {
  await handle(await fetch(`${BASE_URL}/upload/${sourceId}`, { method: 'DELETE' }));
}

export interface KbSource { sourceId: string; filename: string; chunks: number; type: string; }

export async function getKbSources(): Promise<KbSource[]> {
  const data = await handle<{ sources: KbSource[] }>(await fetch(`${BASE_URL}/upload/sources`));
  return data.sources;
}

export async function sendMessage(message: string, mode: TeachMode, sessionId: string, persona?: string): Promise<ChatResult> {
  const safePersona = persona?.trim().slice(0, 80);
  return handle<ChatResult>(await fetch(`${BASE_URL}/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, mode, sessionId, persona: safePersona }),
  }));
}

export interface ImageAttachment { base64: string; mimeType: string; name: string; }

export interface ClientHistoryMessage { role: 'user' | 'assistant'; content: string; }

export async function* streamMessage(
  message: string, mode: TeachMode, sessionId: string,
  signal?: AbortSignal,
  image?: ImageAttachment,
  focusSourceId?: string,
  persona?: string,
  userContext?: string,        // serialised user profile + session memory context
  clientHistory?: ClientHistoryMessage[], // local chat history for serverless hydration
): AsyncGenerator<StreamEvent> {
  const safePersona = persona?.trim().slice(0, 80);
  const body: Record<string, unknown> = { message, mode, sessionId, stream: true, persona: safePersona };
  if (image)         { body.imageBase64 = image.base64; body.imageMimeType = image.mimeType; }
  if (focusSourceId) { body.focusSourceId = focusSourceId; }
  if (userContext)   { body.userContext = userContext.slice(0, 2000); }
  // Send last 40 messages so backend can restore multi-turn context on serverless
  if (clientHistory && clientHistory.length > 0) {
    body.clientHistory = clientHistory.slice(-40);
  }
  const res = await fetch(`${BASE_URL}/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.json(); msg = b.error || msg; } catch {}
    throw new Error(msg);
  }

  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { yield JSON.parse(line.slice(6)); } catch {}
      }
    }
  }
}

export async function clearHistory(sessionId: string): Promise<void> {
  await fetch(`${BASE_URL}/chat/history/${sessionId}`, { method: 'DELETE' });
}

export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export type LLMProvider = 'claude' | 'gemini' | 'openai';

export async function getProvider(): Promise<{ active: LLMProvider; available: LLMProvider[] }> {
  return handle(await fetch(`${BASE_URL}/config/provider`));
}

export async function setProvider(provider: LLMProvider): Promise<{ success: boolean; active: LLMProvider }> {
  return handle(await fetch(`${BASE_URL}/config/provider`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ provider }),
  }));
}

export async function speakWithAI(text: string, voice: TtsVoice = 'nova'): Promise<void> {
  const res = await fetch(`${BASE_URL}/tts`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error(`TTS error: HTTP ${res.status}`);
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}

export async function fetchTtsBlob(text: string, voice: TtsVoice = 'nova'): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/tts`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error(`TTS error: HTTP ${res.status}`);
  return res.blob();
}

export interface SessionMeta {
  id:        string;
  title:     string | null;
  createdAt: number;
  lastUsed:  number;
  summary:   string | null;
}

export interface SessionMessage {
  role:    'user' | 'assistant';
  content: string;
}

export async function getSessions(): Promise<SessionMeta[]> {
  const data = await handle<{ sessions: SessionMeta[] }>(await fetch(`${BASE_URL}/sessions`));
  return data.sessions;
}

export async function getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  const data = await handle<{ messages: SessionMessage[] }>(await fetch(`${BASE_URL}/sessions/${sessionId}/messages`));
  return data.messages;
}

export async function summarizeSession(sessionId: string): Promise<void> {
  await handle(await fetch(`${BASE_URL}/sessions/${sessionId}/summarize`, { method: 'POST' }));
}

export interface ExamRecord {
  score:        number;
  total:        number;
  grade:        string;
  improvements: string[];
  createdAt:    number;
}

export interface ProgressData {
  quiz:             { total: number; correct: number; accuracy: number | null; recentTotal: number; recentCorrect: number; recentAccuracy: number | null };
  grade:            string | null;
  streak:           number;
  topics:           string[];
  modeBreakdown:    Record<string, number>;
  totalSessions:    number;
  todaySessions:    number;
  totalMessages:    number;
  exams:            ExamRecord[];
  topImprovements:  string[];
}

export interface CertDomain { name: string; weight: number; }
export interface CertInfo {
  code:          string;
  name:          string;
  vendor:        string;
  category:      string;
  level:         string;
  questionCount: number;
  timeMinutes:   number;
  passingScore:  string;
  domains:       CertDomain[];
  studyTips:     string[];
}

export async function getCertifications(): Promise<CertInfo[]> {
  const data = await handle<{ certifications: CertInfo[] }>(await fetch(`${BASE_URL}/certifications`));
  return data.certifications;
}

export async function getProgress(): Promise<ProgressData> {
  return handle<ProgressData>(await fetch(`${BASE_URL}/progress`));
}

export interface SearchResult {
  title:    string;
  snippet:  string;
  url?:     string;
}

export async function webSearch(query: string): Promise<{ query: string; results: SearchResult[]; summary: string }> {
  return handle(await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`));
}

export async function getHealth(): Promise<{
  status: string;
  provider: string;
  availableProviders?: LLMProvider[];
  sessions: number;
  knowledgeBase: { totalChunks: number; sourceCount: number };
}> {
  return handle(await fetch(`${BASE_URL}/health`));
}
