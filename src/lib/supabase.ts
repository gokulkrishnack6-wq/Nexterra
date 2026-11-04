import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://czytsaajiicpivjkrbey.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'sb_publishable_B6QITXxUnUplB-T4R1kVog_xrhJYSrz';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

// Production Supabase Client with persistent localStorage auth sessions
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

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
    'Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to connect to live Supabase.'
  );
}
