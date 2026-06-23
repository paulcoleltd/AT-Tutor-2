import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { supabase, supabaseEnabled } from '../lib/supabase';

type Mode = 'signin' | 'register';
type Reachability = 'checking' | 'ok' | 'unreachable';

interface Props { onClose: () => void; }

export const AuthModal: React.FC<Props> = ({ onClose }) => {
  const { user, signInEmail, signOut } = useSupabaseAuth();
  const [mode,        setMode]        = useState<Mode>('signin');
  const [email,       setEmail]       = useState('');
  const [sent,        setSent]        = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [reachable,   setReachable]   = useState<Reachability>(
    supabaseEnabled() ? 'checking' : 'unreachable'
  );

  // Pre-flight: verify Supabase credentials actually work before showing the form
  useEffect(() => {
    if (!supabaseEnabled() || !supabase) { setReachable('unreachable'); return; }
    let cancelled = false;
    supabase.auth.getSession()
      .then(() => { if (!cancelled) setReachable('ok'); })
      .catch(() => { if (!cancelled) setReachable('unreachable'); });
    return () => { cancelled = true; };
  }, []);

  // ── Not configured / unreachable ──────────────────────────────────────────
  if (reachable === 'unreachable') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-center">
            <p className="text-2xl mb-1">⚙️</p>
            <h2 className="text-white font-bold text-base">Auth not configured</h2>
            <p className="text-amber-100 text-xs mt-1">Connect a Supabase project to enable sign-in and sync</p>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Add these to <strong>Vercel → Project → Settings → Environment Variables</strong>, then redeploy:
            </p>
            {[
              { key: 'VITE_SUPABASE_URL',      hint: 'https://xxxx.supabase.co' },
              { key: 'VITE_SUPABASE_ANON_KEY', hint: 'eyJ…' },
            ].map(({ key, hint }) => (
              <div key={key} className="rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-2">
                <p className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">{key}</p>
                <p className="text-xs text-slate-400">{hint}</p>
              </div>
            ))}
            <p className="text-xs text-slate-400">
              No Supabase project yet? Create one free at{' '}
              <span className="text-indigo-500 font-medium">supabase.com</span>, then enable{' '}
              <strong>Email (magic link)</strong> under Authentication → Providers.
            </p>
          </div>
          <div className="px-6 pb-6">
            <button onClick={onClose} className="w-full py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
              Continue without signing in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Checking connectivity ─────────────────────────────────────────────────
  if (reachable === 'checking') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Connecting to auth server…</p>
        </div>
      </div>
    );
  }

  // ── Signed in ─────────────────────────────────────────────────────────────
  if (user) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <p className="text-2xl mb-1">👤</p>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{user.email}</p>
          <p className="text-xs text-slate-400 mt-0.5">Signed in · memory synced across devices</p>
        </div>
        <button
          onClick={async () => { await signOut(); onClose(); }}
          className="w-full py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          Sign out
        </button>
        <button onClick={onClose} className="mt-2 w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          Close
        </button>
      </div>
    </div>
  );

  // ── Auth form ─────────────────────────────────────────────────────────────
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
          {(['signin', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setSent(false); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                mode === m
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {m === 'signin' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-3xl">📧</p>
              <p className="font-semibold text-slate-700 dark:text-slate-200">Check your email</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                We sent a magic link to <strong>{email}</strong>.{' '}
                {isRegister ? 'Click it to activate your account' : 'Click it to sign in'} — no password needed.
              </p>
              <button onClick={() => { setSent(false); setEmail(''); }} className="text-xs text-indigo-500 hover:underline">
                Use a different email
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Email address</label>
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
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !email.includes('@')}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending…' : isRegister ? 'Create Account' : 'Send magic link'}
              </button>

              <p className="text-center text-xs text-slate-400">
                {isRegister ? 'Already have an account?' : 'No account?'}{' '}
                <button
                  onClick={() => { setMode(isRegister ? 'signin' : 'register'); setError(''); }}
                  className="text-indigo-500 hover:underline font-medium"
                >
                  {isRegister ? 'Sign in' : 'Create one'}
                </button>
              </p>
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
