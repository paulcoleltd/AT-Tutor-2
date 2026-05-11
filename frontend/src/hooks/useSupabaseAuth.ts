import { useState, useEffect } from 'react';
import { supabase, User } from '../lib/supabase';

export interface AuthState {
  user:         User | null;
  loading:      boolean;
  signInEmail:  (email: string) => Promise<{ error: string | null }>;
  signOut:      () => Promise<void>;
}

export function useSupabaseAuth(): AuthState {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInEmail = async (email: string) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setUser(null);
  };

  return { user, loading, signInEmail, signOut };
}
