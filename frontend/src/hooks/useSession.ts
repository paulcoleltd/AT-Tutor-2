import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'ai-tutor-session-id';

function getOrCreateSessionId(): string {
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
