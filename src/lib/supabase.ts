import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

// Fallback client to prevent crashing on uninitialized credentials
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);

if (!isSupabaseConfigured) {
  console.info(
    '%c🌿 GreenLoop: Running with Mock State Fallback.',
    'color: #174D36; font-weight: bold;',
    'Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to connect to live Supabase.'
  );
}

