import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client.
 *
 * SECURITY: credentials must come from the environment only — never hardcode
 * them here (this file is bundled into client-side JavaScript, and anything in
 * it is public). Configure `frontend/.env` from `frontend/.env.example`:
 *
 *   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<anon public key>
 *
 * The anon key is public by design, but keeping it out of source control means
 * it can be rotated without a code change or a redeploy.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'in frontend/.env (see frontend/.env.example) and restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

