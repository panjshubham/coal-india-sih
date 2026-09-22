/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_AI_SERVICE_URL: string;
  readonly VITE_CARTO_API_KEY?: string;
  readonly VITE_HF_API_TOKEN?: string;
  // Mine configuration
  readonly VITE_DEFAULT_MINE_ID?: string;
  // Feature flags
  readonly VITE_ALLOW_SIMULATION?: string;   // 'true' = enable browser-side AI fallbacks (dev/demo only)
  // Demo auth
  readonly VITE_DEMO_PASSWORD?: string;      // Password for biometric demo accounts (never ship real credentials)
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
