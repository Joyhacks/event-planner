import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type Role = 'user' | 'seller' | 'super_admin'

export interface Profile {
  id: string
  full_name: string
  role: Role
}

export interface AuthState {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  phoneVerified: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
