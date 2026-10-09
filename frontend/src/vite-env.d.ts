/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_AI_SERVICE_URL: string;
  // SECURITY NOTICE: Never add private API keys (Gemini, Hugging Face, SMTP, AWS, etc.)
  // here. Vite inlines all VITE_* variables into public client bundles.
  // All private keys must remain strictly on the backend server.
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
