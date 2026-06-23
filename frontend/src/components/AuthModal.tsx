import React, { useState } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { supabaseEnabled } from '../lib/supabase';

type Mode = 'signin' | 'register';

interface Props { onClose: () => void; }

export const AuthModal: React.FC<Props> = ({ onClose }) => {
  const { user, signInEmail, signOut } = useSupabaseAuth();
  const [mode,    setMode]    = useState<Mode>('signin');
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  if (!supabaseEnabled()) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
            Authentication requires Supabase to be configured.<br />
            Set <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.
          </p>
          <button onClick={onClose} className="mt-4 w-full py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-sm font-medium">Close</button>
        </div>
      </div>
    );
  }

  if (user) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <p className="text-2xl mb-1">👤</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{user.email}</p>
          <p className="text-xs text-slate-400 mt-0.5">Signed in · memory synced across devices</p>
        </div>
        <button onClick={async () => { await signOut(); onClose(); }}
          className="w-full py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
          Sign out
        </button>
        <button onClick={onClose} className="mt-2 w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          Close
        </button>
      </div>
    </div>
  );

  const isRegister = mode === 'register';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 text-center">
          <p className="text-2xl mb-1">🎓</p>
          <h2 className="text-white font-bold text-base">
            {isRegister ? 'Create your account' : 'Sign in to sync memory'}
          </h2>
          <p className="text-blue-200 text-xs mt-1">
            {isRegister
              ? 'Get a free account — your learning history will sync across devices'
              : 'Your chat history and learning profile will persist across devices'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => { setMode('signin'); setSent(false); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              !isRegister
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setSent(false); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              isRegister
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Register
          </button>
        </div>

        <div className="p-6">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-3xl">📧</p>
              <p className="font-semibold text-slate-700 dark:text-slate-200">Check your email</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isRegister
                  ? <>We sent a magic link to <strong>{email}</strong>. Click it to activate your account — no password needed.</>
                  : <>We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.</>}
              </p>
              <button onClick={() => { setSent(false); setEmail(''); }}
                className="text-xs text-indigo-500 hover:underline">Use a different email</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                  {error.includes('auth server') && (
                    <p className="text-xs text-red-500 dark:text-red-500 mt-1">
                      Add <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
                      <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your Vercel environment variables.
                    </p>
                  )}
                </div>
              )}

              {/* Primary action button */}
              <button
                onClick={handleSubmit}
                disabled={loading || !email.includes('@')}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {loading
                  ? 'Sending…'
                  : isRegister
                    ? 'Create Account'
                    : 'Send magic link'}
              </button>

              {/* Switch mode hint */}
              {isRegister ? (
                <p className="text-center text-xs text-slate-400">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('signin'); setError(''); }}
                    className="text-indigo-500 hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p className="text-center text-xs text-slate-400">
                  No account?{' '}
                  <button
                    onClick={() => { setMode('register'); setError(''); }}
                    className="text-indigo-500 hover:underline font-medium"
                  >
                    Create one
                  </button>
                </p>
              )}
            </div>
          )}
          <button onClick={onClose} className="mt-4 w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  );

  async function handleSubmit() {
    if (!email.includes('@')) return;
    setLoading(true); setError('');
    const { error: err } = await signInEmail(email);
    setLoading(false);
    if (err) setError(err);
    else setSent(true);
  }
};
