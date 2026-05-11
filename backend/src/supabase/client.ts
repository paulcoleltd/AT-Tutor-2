import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseServiceKey) return null;
  return _client ??= createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export const supabaseEnabled = () => !!(CONFIG.supabaseUrl && CONFIG.supabaseServiceKey);
