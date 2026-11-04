/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_TAGLINE: string;
  readonly VITE_DEFAULT_DISTRICT: string;
  readonly VITE_DEFAULT_STATE: string;
  readonly VITE_ENABLE_MOCK_FALLBACK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

