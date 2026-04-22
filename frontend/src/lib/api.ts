const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export type TeachMode = 'explain' | 'quiz' | 'chat' | 'summarize' | 'flashcard';

export interface UploadResult {
  success:     boolean;
  message:     string;
  sourceId?:   string;
  chunksAdded?: number;
  filename?:   string;
  type?:       string;
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

export async function deleteDocument(sourceId: string): Promise<void> {
  await handle(await fetch(`${BASE_URL}/upload/${sourceId}`, { method: 'DELETE' }));
}

export async function sendMessage(message: string, mode: TeachMode, sessionId: string): Promise<ChatResult> {
  return handle<ChatResult>(await fetch(`${BASE_URL}/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, mode, sessionId }),
  }));
}

export async function* streamMessage(
  message: string, mode: TeachMode, sessionId: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, mode, sessionId, stream: true }),
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

export async function getHealth(): Promise<{
  status: string; provider: string; sessions: number;
  knowledgeBase: { totalChunks: number; sources: { sourceId: string; filename: string; chunks: number; type: string }[] };
}> {
  return handle(await fetch(`${BASE_URL}/health`));
}
