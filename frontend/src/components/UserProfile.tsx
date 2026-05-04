/**
 * UserProfile — collapsible sidebar panel where users describe themselves.
 * The profile is persisted to localStorage and injected into every AI request
 * so the tutor personalises tone, depth, and examples automatically.
 */

import React, { useState } from 'react';
import { useUserProfile, ExpertiseLevel, EMPTY_PROFILE } from '../hooks/useUserProfile';

const LEVEL_OPTIONS: { value: ExpertiseLevel; label: string; desc: string }[] = [
  { value: 'beginner',      label: '🟢 Beginner',      desc: 'New to the topic' },
  { value: 'intermediate',  label: '🔵 Intermediate',  desc: 'Some experience' },
  { value: 'advanced',      label: '🟣 Advanced',      desc: 'Strong knowledge' },
  { value: 'expert',        label: '🔴 Expert',         desc: 'Deep expertise' },
];

interface Props {
  onProfileSaved?: () => void;
}

export const UserProfile: React.FC<Props> = ({ onProfileSaved }) => {
  const { profile, updateProfile, clearProfile, hasProfile } = useUserProfile();
  const [open, setOpen]     = useState(!hasProfile); // open by default if empty
  const [saved, setSaved]   = useState(false);
  const [editing, setEditing] = useState(!hasProfile);

  // Local draft — only committed on Save
  const [draft, setDraft] = useState({ ...profile });

  const handleSave = () => {
    updateProfile(draft);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
    onProfileSaved?.();
  };

  const handleEdit = () => {
    setDraft({ ...profile });
    setEditing(true);
  };

  const handleClear = () => {
    clearProfile();
    setDraft({ ...EMPTY_PROFILE });
    setEditing(true);
  };

  const field = (
    key: keyof typeof draft,
    placeholder: string,
    multiline = false,
    rows = 2,
  ) => {
    const cls = "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition";
    return multiline ? (
      <textarea
        rows={rows}
        value={draft[key] as string}
        placeholder={placeholder}
        disabled={!editing}
        onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
        className={`${cls} disabled:opacity-60 disabled:cursor-default`}
      />
    ) : (
      <input
        type="text"
        value={draft[key] as string}
        placeholder={placeholder}
        disabled={!editing}
        onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
        className={`${cls} disabled:opacity-60 disabled:cursor-default`}
      />
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">👤</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              My Profile
            </p>
            {hasProfile && !open && (
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                {profile.name || 'No name'} · {profile.expertiseLevel}
              </p>
            )}
            {!hasProfile && !open && (
              <p className="text-xs text-blue-500 leading-tight mt-0.5">Set up your profile →</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasProfile && (
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
              Active
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
          </svg>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">

          {/* Contextual hint */}
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            Your profile is injected into every AI response so the tutor knows who you are and adapts automatically.
          </p>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Your Name
            </label>
            {field('name', 'e.g. Alex')}
          </div>

          {/* Expertise level */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Expertise Level
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {LEVEL_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  disabled={!editing}
                  onClick={() => setDraft(d => ({ ...d, expertiseLevel: opt.value }))}
                  className={`text-left px-3 py-2 rounded-xl border text-xs transition-all disabled:cursor-default ${
                    draft.expertiseLevel === opt.value
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-300'
                  }`}
                >
                  <span className="block font-medium">{opt.label}</span>
                  <span className="block opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Background
            </label>
            {field('background', 'e.g. Software engineer, 5 yrs Python, new to ML', true, 2)}
          </div>

          {/* Subjects */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Topics I Study
            </label>
            {field('subjects', 'e.g. Machine learning, AWS, Finance, History')}
          </div>

          {/* Learning goals */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Learning Goals
            </label>
            {field('learningGoals', 'e.g. Pass AWS exam by June, understand transformers', true, 2)}
          </div>

          {/* Preferred style */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Preferred Response Style
            </label>
            {field('preferredStyle', 'e.g. Short + code examples, bullet points, analogies')}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Extra Notes for the AI
            </label>
            {field('notes', 'e.g. I prefer metric units, I am dyslexic — keep paragraphs short', true, 2)}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all"
                >
                  {saved ? '✓ Saved!' : 'Save Profile'}
                </button>
                {hasProfile && (
                  <button
                    onClick={() => { setDraft({ ...profile }); setEditing(false); }}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                >
                  ✏️ Edit Profile
                </button>
                <button
                  onClick={handleClear}
                  className="px-3 py-2 rounded-xl text-slate-400 hover:text-red-500 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Clear profile"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
