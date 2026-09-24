import { createClient } from '@supabase/supabase-js'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

export { backendReady } from './env'

export const supabase = createClient(SUPABASE_URL ?? 'http://127.0.0.1:54321', SUPABASE_ANON_KEY ?? 'not-configured', {
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
