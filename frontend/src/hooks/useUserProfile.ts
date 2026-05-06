/**
 * useUserProfile — persists the user's personal profile to localStorage.
 *
 * The profile is injected into every AI chat request so the tutor can
 * personalise explanations, adjust depth, and remember preferences.
 */

import { useState, useCallback } from 'react';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface UserProfile {
  name:           string;
  expertiseLevel: ExpertiseLevel;
  background:     string;  // e.g. "Software engineer, 5 years Python experience"
  learningGoals:  string;  // e.g. "Pass AWS Solutions Architect exam by June"
  subjects:       string;  // e.g. "Cloud computing, Machine learning, DevOps"
  preferredStyle: string;  // e.g. "Short answers with code examples"
  notes:          string;  // Anything else the AI should always know
}

export const EMPTY_PROFILE: UserProfile = {
  name:           '',
  expertiseLevel: 'intermediate',
  background:     '',
  learningGoals:  '',
  subjects:       '',
  preferredStyle: '',
  notes:          '',
};

const STORAGE_KEY = 'ai-tutor-user-profile';

function load(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    return { ...EMPTY_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

function save(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch { /* quota exceeded */ }
}

/** Serialise the profile into a short natural-language context block for the LLM. */
export function profileToContext(p: UserProfile): string {
  if (!p.name && !p.background && !p.learningGoals && !p.subjects) return '';
  const lines: string[] = ['[USER PROFILE — use this to personalise every response]'];
  if (p.name)           lines.push(`Name: ${p.name}`);
  if (p.expertiseLevel) lines.push(`Expertise: ${p.expertiseLevel}`);
  if (p.background)     lines.push(`Background: ${p.background}`);
  if (p.subjects)       lines.push(`Subjects of interest: ${p.subjects}`);
  if (p.learningGoals)  lines.push(`Learning goals: ${p.learningGoals}`);
  if (p.preferredStyle) lines.push(`Preferred response style: ${p.preferredStyle}`);
  if (p.notes)          lines.push(`Additional context: ${p.notes}`);
  return lines.join('\n');
}

export function useUserProfile() {
  const [profile, setProfileState] = useState<UserProfile>(load);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfileState(prev => {
      const next = { ...prev, ...updates };
      save(next);
      return next;
    });
  }, []);

  const clearProfile = useCallback(() => {
    const empty = { ...EMPTY_PROFILE };
    save(empty);
    setProfileState(empty);
  }, []);

  const hasProfile = profile.name.trim().length > 0 || profile.background.trim().length > 0;

  return { profile, updateProfile, clearProfile, hasProfile };
}
