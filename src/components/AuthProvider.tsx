import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type Profile } from '../lib/authContext'
import { backendReady, supabase } from '../lib/supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(backendReady)

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('id, full_name, role').eq('id', s.user.id).maybeSingle()
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    if (!backendReady) return
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      // Defer: calling Supabase inside this callback can deadlock the client.
      setTimeout(() => void loadProfile(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value = useMemo(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      phoneVerified: Boolean(session?.user?.phone_confirmed_at),
      refreshProfile: async () => {
        const { data } = await supabase.auth.refreshSession()
        setSession(data.session)
        await loadProfile(data.session)
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setProfile(null)
      },
    }),
    [loading, session, profile, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
