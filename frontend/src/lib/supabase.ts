import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const akey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && akey ? createClient(url, akey) : null;

export const supabaseEnabled = () => !!supabase;

export type { User };
