import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'ai-tutor-session-id';

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = uuidv4();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useSession() {
  const [sessionId] = useState<string>(getOrCreateSessionId);

  const resetSession = () => {
    const newId = uuidv4();
    sessionStorage.setItem(SESSION_KEY, newId);
    return newId;
  };

  return { sessionId, resetSession };
}
