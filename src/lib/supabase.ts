import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until the Supabase project is connected (see supabase/README.md). */
export const backendReady = Boolean(url && anonKey)

export const supabase = createClient(url ?? 'http://127.0.0.1:54321', anonKey ?? 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

/** Turns Supabase and Edge Function errors into a sentence for the user. */
export async function errorMessage(error: unknown): Promise<string> {
  if (!error) return ''
  const e = error as { message?: string; context?: Response }
  if (e.context && typeof e.context.json === 'function') {
    const body = await e.context
      .clone()
      .json()
      .catch(() => null)
    if (body?.error) return String(body.error)
  }
  return e.message ?? 'Something went wrong. Please try again.'
}

/** Throws a readable Error for a failed Supabase call. */
export async function unwrap<T>(result: { data: T; error: unknown }): Promise<T> {
  if (result.error) throw new Error(await errorMessage(result.error))
  return result.data
}
