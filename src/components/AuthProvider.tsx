import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type Profile } from '../lib/authContext'
import { backendReady } from '../lib/env'

// Loaded on demand so visitors to the landing page don't download it.
const client = () => import('../lib/supabase').then((m) => m.supabase)

/** True when this browser may be signed in, or is returning from a magic link. */
function mightBeSignedIn(): boolean {
  if (new URLSearchParams(window.location.search).has('code')) return true
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? ''
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) return true
    }
  } catch {
    return true
  }
  return false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(() => backendReady && mightBeSignedIn())

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null)
      return
    }
    const supabase = await client()
    const { data } = await supabase.from('profiles').select('id, full_name, role').eq('id', s.user.id).maybeSingle()
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    // Visitors who have never signed in don't need the Supabase client yet.
    if (!backendReady || !mightBeSignedIn()) return
    let unsubscribe = () => {}
    let cancelled = false
    void client().then(async (supabase) => {
      if (cancelled) return
      const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s)
        // Defer: calling Supabase inside this callback can deadlock the client.
        setTimeout(() => void loadProfile(s), 0)
      })
      unsubscribe = () => sub.subscription.unsubscribe()
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      await loadProfile(data.session)
      setLoading(false)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      phoneVerified: Boolean(session?.user?.phone_confirmed_at),
      refreshProfile: async () => {
        const supabase = await client()
        const { data } = await supabase.auth.refreshSession()
        setSession(data.session)
        await loadProfile(data.session)
      },
      signOut: async () => {
        const supabase = await client()
        await supabase.auth.signOut()
        setProfile(null)
      },
    }),
    [loading, session, profile, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
