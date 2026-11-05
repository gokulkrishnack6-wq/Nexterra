import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

// Production Supabase Client with persistent localStorage auth sessions
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

if (isSupabaseConfigured) {
  console.info(
    '%c🌿 GreenLoop: Connected to Live Supabase Backend.',
    'color: #234B35; font-weight: bold;',
    supabaseUrl
  );
} else {
  console.info(
    '%c🌿 GreenLoop: Running with Mock State Fallback.',
    'color: #174D36; font-weight: bold;',
    'Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to connect to live Supabase.'
  );
}
