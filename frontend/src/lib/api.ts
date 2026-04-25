const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export type TeachMode = 'explain' | 'quiz' | 'chat' | 'summarize' | 'flashcard';

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

export interface StreamEvent {
  token?:   string;
  sources?: string[];
  done?:    boolean;
  error?:   string;
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

export async function sendMessage(message: string, mode: TeachMode, sessionId: string, persona?: string): Promise<ChatResult> {
  return handle<ChatResult>(await fetch(`${BASE_URL}/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, mode, sessionId, persona }),
  }));
}

export interface ImageAttachment { base64: string; mimeType: string; name: string; }

export async function* streamMessage(
  message: string, mode: TeachMode, sessionId: string,
  signal?: AbortSignal,
  image?: ImageAttachment,
  focusSourceId?: string,
  persona?: string,
): AsyncGenerator<StreamEvent> {
  const body: Record<string, unknown> = { message, mode, sessionId, stream: true, persona };
  if (image)         { body.imageBase64 = image.base64; body.imageMimeType = image.mimeType; }
  if (focusSourceId) { body.focusSourceId = focusSourceId; }
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

export async function getHealth(): Promise<{
  status: string;
  provider: string;
  availableProviders?: LLMProvider[];
  sessions: number;
  knowledgeBase: { totalChunks: number; sources: { sourceId: string; filename: string; chunks: number; type: string }[] };
}> {
  return handle(await fetch(`${BASE_URL}/health`));
}
