import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AuthContext, type Profile } from '../lib/authContext'
import { backendReady } from '../lib/env'
import { useCloudPlanner, openCloudCache } from '../store/cloudPlanner'

const client = () => import('../lib/supabase').then((m) => m.supabase)
const message = (e: unknown) => (e instanceof Error ? e.message : 'Could not load your account. Please try again.')

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(backendReady)
  const [error, setError] = useState('')
  const generation = useRef(0)

  const loadProfile = useCallback(async (s: Session | null) => {
    const request = ++generation.current
    setProfile(null)
    if (!s) return
    try {
      const db = await client()
      const { data, error } = await db
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', s.user.id)
        .abortSignal(AbortSignal.timeout(15_000))
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Your account profile is unavailable. Please contact support.')
      if (request === generation.current) {
        setProfile(data as Profile)
        setError('')
      }
    } catch (e) {
      if (request === generation.current) setError(message(e))
    }
  }, [])

  useEffect(() => {
    if (!backendReady) return
    const requestCounter = generation
    let cancelled = false
    let unsubscribe = () => {}
    const deadline = setTimeout(() => {
      if (!cancelled) {
        setLoading(false)
        setError('Sign-in is taking too long. Check your connection and reload.')
      }
    }, 20_000)
    void client()
      .then(async (db) => {
        if (cancelled) return
        // Always subscribe, including before the browser's first sign-in.
        const { data } = db.auth.onAuthStateChange((_event, next) => {
          if (cancelled) return
          setSession(next)
          setLoading(false)
          clearTimeout(deadline)
          // Avoid Supabase calls inside its auth lock.
          setTimeout(() => {
            if (!cancelled) void loadProfile(next)
          }, 0)
        })
        unsubscribe = () => data.subscription.unsubscribe()
        const { error } = await db.auth.getSession()
        if (error) throw error
      })
      .catch((e) => {
        if (!cancelled) {
          setError(message(e))
          setLoading(false)
          clearTimeout(deadline)
        }
      })
    return () => {
      cancelled = true
      requestCounter.current++
      clearTimeout(deadline)
      unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo(
    () => ({
      loading,
      error,
      session,
      user: session?.user ?? null,
      profile,
      phoneVerified: Boolean(session?.user?.phone_confirmed_at),
      refreshProfile: async () => {
        setError('')
        const db = await client()
        const { data, error } = await db.auth.refreshSession()
        if (error) throw error
        setSession(data.session)
        await loadProfile(data.session)
      },
      signOut: async () => {
        if (Object.values(useCloudPlanner.getState().records).some((r) => r.dirty))
          throw new Error(
            'Resolve pending cloud changes before signing out. You can download a backup and load the cloud version.',
          )
        const db = await client()
        const { error } = await db.auth.signOut({ scope: 'local' })
        if (error) throw error
        if (session?.user.id) localStorage.removeItem(`ariya-cloud-${session.user.id}`)
        openCloudCache(null)
        setSession(null)
        setProfile(null)
        setError('')
      },
    }),
    [loading, error, session, profile, loadProfile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
