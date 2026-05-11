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

// CWE-863: Verify RLS is enabled on all memory tables at startup.
// Logs a warning (non-fatal) — hard enforcement requires RLS policies in migrations.sql.
const MEMORY_TABLES = ['user_profiles', 'chat_sessions', 'chat_messages', 'user_memories'];
export async function verifySupabaseRLS(): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  try {
    const { data } = await db
      .from('information_schema.tables')
      .select('table_name, row_security')
      .in('table_name', MEMORY_TABLES)
      .eq('table_schema', 'public');

    const disabled = (data ?? []).filter((r: Record<string, string>) => r.row_security !== 'ENABLED');
    if (disabled.length > 0) {
      console.warn(
        `[supabase] WARNING: RLS is NOT enabled on: ${disabled.map((r: Record<string, string>) => r.table_name).join(', ')}. ` +
        'Run the migrations.sql ENABLE ROW LEVEL SECURITY statements.',
      );
    } else {
      console.log('[supabase] RLS verified on all memory tables.');
    }
  } catch {
    console.warn('[supabase] Could not verify RLS — check database permissions.');
  }
}
