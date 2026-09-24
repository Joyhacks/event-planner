// Build-time configuration that is safe to import anywhere, without pulling
// the Supabase client into the landing-page bundle.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until the Supabase project is connected (see supabase/README.md). */
export const backendReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
