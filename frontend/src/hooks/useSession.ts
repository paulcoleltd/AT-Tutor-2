import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'ai-tutor-session-id';

function getOrCreateSessionId(): string {
  // CWE-598: Check sessionStorage for a resume token (set by App.tsx without
  // exposing the ID in the URL). Clears after read — one-time use.
  const resumeId = sessionStorage.getItem('ai-tutor-resume-session');
  if (resumeId) {
    sessionStorage.removeItem('ai-tutor-resume-session');
    localStorage.setItem(SESSION_KEY, resumeId);
    return resumeId;
  }
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string>(getOrCreateSessionId);

  const resetSession = () => {
    const newId = uuidv4();
    localStorage.setItem(SESSION_KEY, newId);
    setSessionId(newId);
    return newId;
  };

  const resumeSession = (id: string) => {
    localStorage.setItem(SESSION_KEY, id);
    setSessionId(id);
  };

  return { sessionId, resetSession, resumeSession };
}
