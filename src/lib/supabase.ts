import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

// Production Supabase Client with persistent localStorage auth sessions and PKCE flow
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

/**
 * Canonical production URL for GreenLoop deployed on Render.
 */
export const GREENLOOP_PRODUCTION_URL = 'https://greenloop-9tm5.onrender.com';

/**
 * Resolves the canonical, environment-aware Auth Redirect URL for Supabase Auth emails
 * (confirmations, password resets, invitations).
 *
 * Rules:
 * - In production (Render or custom domain): uses the production origin.
 * - In local development: uses the active local host and port (e.g. http://localhost:5173).
 * - Never uses or hardcodes http://localhost:3000.
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // 1. Explicit env override (if configured and valid)
  const envUrl = import.meta.env.VITE_SITE_URL || import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('localhost:3000')) {
    return `${envUrl.trim().replace(/\/+$/, '')}${normalizedPath}`;
  }

  // 2. Client-side browser: dynamically detect current window origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    if (!origin.includes('localhost:3000')) {
      return `${origin}${normalizedPath}`;
    }
  }

  // 3. Fallback for build time, SSR, or production default
  return `${GREENLOOP_PRODUCTION_URL}${normalizedPath}`;
}

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
